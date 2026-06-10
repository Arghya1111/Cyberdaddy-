"""
CyberDaddy - Scam Detection Celery Tasks
============================================================
Core async scan processing pipeline:
1. process_scan_task → Main entry, dispatches to type-specific analyzers
2. process_screenshot_scan → Image analysis (GPT-4o Vision)
3. process_text_scan → SMS/Email/URL text analysis (GPT-4o)
4. finalize_scan_results → Save results, trigger notifications
"""

import logging
import time
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.scam_detection.tasks.process_scan_task",
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
    time_limit=180,  # 3-minute hard limit per scan
)
def process_scan_task(self, scan_id: str):
    """
    Main scan processing task.
    Orchestrates the complete scan analysis pipeline.
    """
    from apps.scam_detection.models import ScanHistory
    from apps.scam_detection.services import AIAnalysisService, ThreatMatchingService

    start_time = time.time()

    try:
        scan = ScanHistory.objects.select_related("user").get(id=scan_id)

        # Mark as processing
        scan.status = ScanHistory.ScanStatus.PROCESSING
        scan.save(update_fields=["status"])

        # --- Step 1: Determine input text ---
        input_text = ""
        if scan.scan_type == ScanHistory.ScanType.SCREENSHOT:
            # Download file from S3/local storage
            image_path = scan.scan_input_file.path if scan.scan_input_file else None
            if not image_path:
                raise ValueError("No image file provided for screenshot scan")
            ai_result = AIAnalysisService.analyze_image(image_path)
        else:
            input_text = scan.scan_input_text or scan.scan_input_url
            ai_result = AIAnalysisService.analyze_text(input_text, scan.scan_type)

        # --- Step 2: Threat DB Matching ---
        threat_matches = ThreatMatchingService.match_threats(
            text=input_text,
            url=scan.scan_input_url if scan.scan_type == ScanHistory.ScanType.URL else None
        )

        # --- Step 3: Calculate Combined Risk Score ---
        ai_risk_score = float(ai_result.get("risk_score", 0))
        final_risk_score = ThreatMatchingService.calculate_risk_score(ai_risk_score, threat_matches)

        # --- Step 4: Determine Risk Level ---
        risk_level = _score_to_risk_level(final_risk_score)

        # --- Step 5: Save Results ---
        processing_ms = int((time.time() - start_time) * 1000)

        scan.status = ScanHistory.ScanStatus.COMPLETED
        scan.risk_score = final_risk_score
        scan.risk_level = risk_level
        scan.is_threat = final_risk_score >= 40
        scan.ai_response = ai_result
        scan.ai_summary = ai_result.get("summary", "")
        scan.scam_category = ai_result.get("scam_category", "")
        scan.processing_time_ms = processing_ms
        scan.save()

        # --- Step 6: Create Threat Matches in DB ---
        from apps.scam_detection.models import ThreatScanMatch
        for threat, confidence, method, matched_text in threat_matches[:5]:  # Top 5 only
            ThreatScanMatch.objects.get_or_create(
                scan=scan,
                threat=threat,
                defaults={
                    "confidence_score": confidence,
                    "match_method": method,
                    "matched_text": str(matched_text)[:500],
                }
            )
            threat.increment_reported_count()

        # --- Step 7: Trigger Notifications ---
        if scan.is_threat:
            from apps.notifications.tasks import send_threat_alert_task
            from django.conf import settings as _settings
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    send_threat_alert_task(str(scan.id))
                except Exception as notify_exc:
                    logger.warning(f"Threat notification failed (non-critical): {notify_exc}")
            else:
                send_threat_alert_task.delay(str(scan.id))

        # --- Step 8: Update User Safety Score ---
        from django.conf import settings as _settings
        if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                update_user_safety_score_task(str(scan.user.id))
            except Exception as score_exc:
                logger.warning(f"Safety score update failed (non-critical): {score_exc}")
        else:
            update_user_safety_score_task.delay(str(scan.user.id))

        logger.info(
            f"Scan {scan_id} completed | risk={final_risk_score:.1f} | "
            f"level={risk_level} | time={processing_ms}ms"
        )
        return {"scan_id": scan_id, "risk_score": final_risk_score, "risk_level": risk_level}

    except ScanHistory.DoesNotExist:
        logger.error(f"Scan {scan_id} not found")
        return {"error": "Scan not found"}

    except Exception as exc:
        logger.error(f"Scan {scan_id} failed: {exc}", exc_info=True)
        try:
            scan = ScanHistory.objects.get(id=scan_id)
            scan.status = ScanHistory.ScanStatus.FAILED
            scan.error_message = str(exc)
            scan.save(update_fields=["status", "error_message"])
        except Exception:
            pass
        raise self.retry(exc=exc)


@shared_task(
    name="apps.scam_detection.tasks.update_user_safety_score_task",
    queue="ai",
)
def update_user_safety_score_task(user_id: str):
    """
    Recalculate and update user's safety score after each scan.
    Safety score = 100 - weighted average of recent threat encounters.
    """
    from apps.users.models import User
    from apps.scam_detection.models import ScanHistory
    from django.utils import timezone
    from datetime import timedelta

    try:
        user = User.objects.get(id=user_id)

        # Look at last 30 days of scans
        recent_scans = ScanHistory.objects.filter(
            user=user,
            status=ScanHistory.ScanStatus.COMPLETED,
            created_at__gte=timezone.now() - timedelta(days=30)
        )

        total = recent_scans.count()
        if total == 0:
            return

        threats = recent_scans.filter(is_threat=True).count()
        threat_ratio = threats / total
        new_score = max(0, 100 - (threat_ratio * 100 * 1.5))  # Weighted penalty

        user.safety_score = round(new_score, 2)
        user.save(update_fields=["safety_score"])

        # Update AI insights record
        from apps.ai_insights.models import AIInsight
        AIInsight.objects.filter(user=user).update(
            safety_score=new_score,
            total_scans=total,
            total_threats_detected=threats,
        )

    except Exception as e:
        logger.error(f"Failed to update safety score for user {user_id}: {e}")


def _score_to_risk_level(score: float) -> str:
    """Convert numeric risk score to categorical risk level."""
    if score < 20:
        return "safe"
    elif score < 40:
        return "low"
    elif score < 65:
        return "medium"
    elif score < 85:
        return "high"
    else:
        return "critical"
