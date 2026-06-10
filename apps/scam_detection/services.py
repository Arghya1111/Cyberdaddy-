"""
CyberDaddy - AI Scam Detection Service Layer
============================================================
Architecture:
1. ScanService.create_scan() → creates DB record, runs analysis synchronously
   (Celery is disabled on PythonAnywhere MVP — CELERY_TASK_ALWAYS_EAGER=True
    makes .apply_async() run inline, but we also support direct calls)
2. AIAnalysisService.analyze_*() → calls Groq (primary) or OpenAI (fallback)
3. ThreatMatchingService.match_threats() → fast DB-level threat matching
4. ScanService.finalize_scan() → saves results, triggers notifications
"""

import logging
import time
from typing import Optional
from django.conf import settings
from django.core.cache import cache
from apps.core.exceptions import ScanLimitExceededError

logger = logging.getLogger(__name__)


class ScanService:
    """Orchestrates the scan lifecycle."""

    @staticmethod
    def create_scan(user, scan_type: str, **kwargs) -> "ScanHistory":
        """
        Entry point for all scan requests.
        1. Validates user has scan quota remaining
        2. Creates scan record in DB with PENDING status
        3. Dispatches Celery task for async AI processing
        4. Returns scan object immediately (non-blocking)
        """
        from apps.scam_detection.models import ScanHistory
        from apps.subscriptions.models import Subscription
        from apps.scam_detection.tasks import process_scan_task

        # --- Subscription Check ---
        # On PythonAnywhere MVP we allow scans even without a subscription
        # to keep the demo fully functional.
        try:
            subscription = user.subscription
            if not subscription.has_scans_remaining:
                raise ScanLimitExceededError()
        except Subscription.DoesNotExist:
            # Demo mode: no subscription required
            subscription = None
            logger.warning(f"User {user.email} has no subscription — demo mode scan allowed.")

        # --- Create Scan Record ---
        scan = ScanHistory.objects.create(
            user=user,
            scan_type=scan_type,
            status=ScanHistory.ScanStatus.PENDING,
            **kwargs,
        )

        # --- Run synchronously (no Celery on PythonAnywhere) ---
        # CELERY_TASK_ALWAYS_EAGER=True also makes .apply_async() sync,
        # but calling directly is more explicit and reliable.
        from django.conf import settings as _settings
        _celery_eager = getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False)

        if _celery_eager:
            # Run the task function directly and synchronously
            try:
                process_scan_task(str(scan.id))
            except Exception as exc:
                logger.error(f"Synchronous scan processing failed: {exc}", exc_info=True)
        else:
            # Full async mode (production with Celery worker)
            task = process_scan_task.apply_async(
                args=[str(scan.id)],
                queue="ai",
                countdown=0,
            )
            scan.celery_task_id = task.id
            scan.save(update_fields=["celery_task_id"])

        # --- Increment Usage Counter ---
        if subscription:
            subscription.increment_scan_count()

        # Refresh from DB to get updated status after sync processing
        scan.refresh_from_db()
        logger.info(f"Scan completed: {scan.id} | type={scan_type} | user={user.email}")
        return scan

    @staticmethod
    def get_scan_result(scan_id: str, user) -> "ScanHistory":
        """Fetch a scan result with caching."""
        cache_key = f"scan_result_{scan_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        from apps.scam_detection.models import ScanHistory
        scan = ScanHistory.objects.select_related("user").prefetch_related(
            "threat_matches__threat"
        ).get(id=scan_id, user=user)

        # Cache completed scans for 5 minutes
        if scan.status == ScanHistory.ScanStatus.COMPLETED:
            cache.set(cache_key, scan, timeout=300)

        return scan

    @staticmethod
    def get_scan_history(user, filters: dict = None):
        """
        Return paginated scan history for a user.
        Uses select_related to avoid N+1 queries.
        """
        from apps.scam_detection.models import ScanHistory
        qs = ScanHistory.objects.filter(user=user).select_related("user")

        if filters:
            if scan_type := filters.get("scan_type"):
                qs = qs.filter(scan_type=scan_type)
            if risk_level := filters.get("risk_level"):
                qs = qs.filter(risk_level=risk_level)
            if is_threat := filters.get("is_threat"):
                qs = qs.filter(is_threat=is_threat == "true")

        return qs


class AIAnalysisService:
    """Calls Groq (primary) or OpenAI (fallback) to analyze scan inputs."""

    SYSTEM_PROMPT = """You are CyberDaddy, an expert AI cybersecurity analyst specializing in 
    Indian digital fraud, scam detection, and phishing analysis. Analyze the provided content 
    and return a structured JSON assessment with: risk_score (0-100), risk_level 
    (safe/low/medium/high/critical), is_threat (bool), scam_category, summary (max 200 chars), 
    detailed_reasoning, red_flags (list), recommended_action."""

    @classmethod
    def _get_client(cls):
        """
        Returns an OpenAI-compatible client.
        Prefers Groq (faster, cheaper) if GROQ_API_KEY is set.
        Falls back to OpenAI if OPENAI_API_KEY is set.
        """
        import openai
        groq_key = getattr(settings, 'GROQ_API_KEY', '')
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')

        if groq_key:
            return openai.OpenAI(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
            ), "llama-3.3-70b-versatile"  # Best Groq model for analysis
        elif openai_key:
            return openai.OpenAI(api_key=openai_key), getattr(settings, 'OPENAI_MODEL', 'gpt-4o')
        else:
            raise ValueError(
                "No AI API key configured. Set GROQ_API_KEY or OPENAI_API_KEY "
                "in your .env file."
            )

    @classmethod
    def analyze_text(cls, text: str, scan_type: str) -> dict:
        """Analyze SMS, email, or URL text content using Groq or OpenAI."""
        client, model = cls._get_client()

        prompt = f"""Analyze this {scan_type} content for cybersecurity threats and scams:

---
{text[:4000]}
---

Return a valid JSON object only, no markdown."""

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": cls.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS,
                temperature=settings.OPENAI_TEMPERATURE,
                response_format={"type": "json_object"},
            )
            import json
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            logger.error(f"AI API error during text analysis (model={model}): {e}")
            raise

    @classmethod
    def analyze_image(cls, image_path: str) -> dict:
        """
        Analyze screenshot/image for scam content.
        Uses GPT-4o Vision if OpenAI key is set.
        Falls back to Groq text model with image description if only Groq key is set
        (Groq's llama-3.3-70b supports vision via llava endpoint).
        """
        import base64

        with open(image_path, "rb") as img_file:
            image_data = base64.b64encode(img_file.read()).decode("utf-8")

        client, model = cls._get_client()
        groq_key = getattr(settings, 'GROQ_API_KEY', '')

        # Choose vision model
        if groq_key:
            vision_model = "meta-llama/llama-4-scout-17b-16e-instruct"  # Groq vision model
        else:
            vision_model = "gpt-4o"  # OpenAI vision

        try:
            import json
            response = client.chat.completions.create(
                model=vision_model,
                messages=[
                    {"role": "system", "content": cls.SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this screenshot for scams/fraud:"},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                            },
                        ],
                    },
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"AI Vision API error (model={vision_model}): {e}")
            raise


class ThreatMatchingService:
    """
    Fast threat matching using PostgreSQL-level operations.
    Avoids loading the entire threat database into Python memory.
    """

    @staticmethod
    def match_threats(text: str, url: str = None) -> list:
        """
        Match text/URL against the ThreatDatabase.
        Returns list of (ThreatDatabase, confidence_score, match_method) tuples.
        """
        from apps.threat_intelligence.models import ThreatDatabase
        import re

        matches = []
        text_lower = text.lower()

        # Fetch active threats (cached for 1 hour)
        cache_key = "active_threat_patterns"
        threats = cache.get(cache_key)
        if not threats:
            threats = list(
                ThreatDatabase.objects.filter(is_active=True).only(
                    "id", "keywords", "malicious_urls", "regex_patterns", "severity"
                )
            )
            cache.set(cache_key, threats, timeout=3600)

        for threat in threats:
            # Keyword matching
            for keyword in threat.keywords:
                if keyword.lower() in text_lower:
                    confidence = min(0.5 + (threat.severity * 0.1), 0.95)
                    matches.append((threat, confidence, "keyword", keyword))
                    break

            # URL matching
            if url:
                for malicious_url in threat.malicious_urls:
                    if malicious_url.lower() in url.lower():
                        matches.append((threat, 0.95, "url", malicious_url))
                        break

            # Regex matching
            for pattern in threat.regex_patterns:
                try:
                    if re.search(pattern, text, re.IGNORECASE):
                        matches.append((threat, 0.85, "regex", pattern))
                        break
                except re.error:
                    pass

        # Sort by confidence score descending
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[:20]  # Return top 20 matches max

    @staticmethod
    def calculate_risk_score(ai_score: float, threat_matches: list) -> float:
        """
        Combine AI risk score with threat DB matches for final score.
        Weighted: 70% AI analysis, 30% DB matches.
        """
        if not threat_matches:
            return ai_score

        max_confidence = max(m[1] for m in threat_matches)
        db_score = max_confidence * 100
        combined = (ai_score * 0.7) + (db_score * 0.3)
        return min(combined, 100.0)
