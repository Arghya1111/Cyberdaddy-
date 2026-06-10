"""
CyberDaddy - AI Scam Detection Models
============================================================
Tables:
- scan_history          → Each scan request (screenshot, URL, SMS, email)
- threat_scan_matches   → Matched threats found during a scan

Design:
- Scans are async: created immediately, processed by Celery worker
- AI response (GPT-4o analysis) stored in JSONField for flexibility
- Risk scores are 0-100 (100 = highest risk)
- Scan results link to matching threats in the threat_database
"""

import uuid
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class ScanHistory(TimeStampedModel):
    """
    Records every scan request submitted by a user.
    Scans are processed asynchronously via Celery.
    """

    class ScanType(models.TextChoices):
        SCREENSHOT = "screenshot", "Screenshot / Image"
        SMS = "sms", "SMS Text"
        URL = "url", "URL / Link"
        EMAIL = "email", "Email Content"
        PHONE_NUMBER = "phone_number", "Phone Number"

    class ScanStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class RiskLevel(models.TextChoices):
        SAFE = "safe", "Safe"
        LOW = "low", "Low Risk"
        MEDIUM = "medium", "Medium Risk"
        HIGH = "high", "High Risk"
        CRITICAL = "critical", "Critical Threat"

    # Ownership
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scans",
    )
    family_member = models.ForeignKey(
        "family.FamilyMember",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="scans",
        help_text="Set if scan was triggered from family monitoring"
    )

    # Scan Input
    scan_type = models.CharField(max_length=20, choices=ScanType.choices, db_index=True)
    scan_input_text = models.TextField(
        blank=True,
        help_text="Raw text input (for SMS, URL, email scans)"
    )
    scan_input_file = models.FileField(
        upload_to="scan_uploads/%Y/%m/",
        null=True, blank=True,
        help_text="Uploaded file (for screenshot scans)"
    )
    scan_input_url = models.URLField(
        max_length=2048, blank=True,
        help_text="URL being scanned"
    )

    # Processing State
    status = models.CharField(
        max_length=20, choices=ScanStatus.choices,
        default=ScanStatus.PENDING, db_index=True
    )
    celery_task_id = models.CharField(
        max_length=255, blank=True,
        help_text="Celery task ID for tracking async processing"
    )

    # Results
    risk_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text="AI-calculated risk score 0-100"
    )
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices,
        blank=True, db_index=True
    )
    is_threat = models.BooleanField(
        default=False, db_index=True
    )

    # AI Analysis Output
    ai_response = models.JSONField(
        null=True, blank=True,
        help_text="Full AI analysis result including reasoning, categories, recommendations"
    )
    ai_summary = models.TextField(
        blank=True,
        help_text="Human-readable AI summary for display in app"
    )
    scam_category = models.CharField(
        max_length=100, blank=True,
        help_text="Detected scam category (e.g., phishing, investment fraud)"
    )

    # Metadata
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "scan_history"
        verbose_name = "Scan"
        verbose_name_plural = "Scan History"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "scan_type", "created_at"]),
            models.Index(fields=["user", "is_threat", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"[{self.scan_type}] {self.user.email} — {self.risk_level or 'pending'}"


class ThreatScanMatch(TimeStampedModel):
    """
    Links a ScanHistory record to specific threats found in the ThreatDatabase.
    A single scan can match multiple threat records.
    """

    scan = models.ForeignKey(
        ScanHistory,
        on_delete=models.CASCADE,
        related_name="threat_matches"
    )
    threat = models.ForeignKey(
        "threat_intelligence.ThreatDatabase",
        on_delete=models.CASCADE,
        related_name="scan_matches"
    )

    # Match confidence score (0-1)
    confidence_score = models.DecimalField(max_digits=4, decimal_places=3)
    match_method = models.CharField(
        max_length=30,
        choices=[
            ("keyword", "Keyword Match"),
            ("url", "URL Match"),
            ("ai", "AI Pattern Match"),
            ("regex", "Regex Match"),
        ],
    )
    matched_text = models.TextField(
        blank=True,
        help_text="The specific text/URL that triggered this match"
    )

    class Meta:
        db_table = "threat_scan_matches"
        verbose_name = "Threat Scan Match"
        verbose_name_plural = "Threat Scan Matches"
        unique_together = [["scan", "threat"]]

    def __str__(self):
        return f"Scan {self.scan.id} → Threat {self.threat.id} ({self.confidence_score})"
