"""
CyberDaddy - Threat Intelligence Models
============================================================
Table: threat_database

Design:
- Stores known scam patterns: keywords, URLs, phone numbers
- Severity levels drive alert urgency
- Source tracking for credibility scoring
- AI matching logic uses pg_trgm for fuzzy text search
- Indexed for high-performance lookup during real-time scans
"""

from django.db import models
from apps.core.models import TimeStampedModel

# GinIndex is only available with PostgreSQL (django.contrib.postgres).
# On SQLite (PythonAnywhere MVP), we fall back to regular BTreeIndex.
try:
    from django.contrib.postgres.indexes import GinIndex
    _USE_GIN = True
except ImportError:
    _USE_GIN = False


class ThreatDatabase(TimeStampedModel):
    """
    Central threat intelligence registry.
    Each record represents one known scam pattern, malicious URL, or keyword set.
    """

    class ScamCategory(models.TextChoices):
        PHISHING = "phishing", "Phishing"
        FINANCIAL_FRAUD = "financial_fraud", "Financial / Investment Fraud"
        LOTTERY_SCAM = "lottery_scam", "Lottery / Prize Scam"
        ROMANCE_SCAM = "romance_scam", "Romance Scam"
        TECH_SUPPORT = "tech_support", "Tech Support Scam"
        IMPERSONATION = "impersonation", "Government / Bank Impersonation"
        JOB_SCAM = "job_scam", "Fake Job Offer"
        UPI_FRAUD = "upi_fraud", "UPI / Payment Fraud"
        MALWARE = "malware", "Malware / Ransomware"
        SOCIAL_ENGINEERING = "social_engineering", "Social Engineering"
        FAKE_ECOMMERCE = "fake_ecommerce", "Fake E-Commerce"
        CRYPTOCURRENCY = "cryptocurrency", "Cryptocurrency Fraud"
        OTHER = "other", "Other"

    class SeverityLevel(models.IntegerChoices):
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"
        CRITICAL = 4, "Critical"

    class ThreatSource(models.TextChoices):
        MANUAL = "manual", "Manually Added"
        AI_DETECTED = "ai_detected", "AI Detected"
        USER_REPORTED = "user_reported", "User Reported"
        EXTERNAL_FEED = "external_feed", "External Threat Feed"
        CERT_IN = "cert_in", "CERT-In Advisory"
        RBI = "rbi", "RBI Advisory"

    # Core Threat Data
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=30, choices=ScamCategory.choices, db_index=True
    )
    severity = models.IntegerField(
        choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM, db_index=True
    )

    # Matching Data
    keywords = models.JSONField(
        default=list,
        help_text="List of keywords/phrases used for matching (e.g., ['free prize', 'click now'])"
    )
    malicious_urls = models.JSONField(
        default=list,
        help_text="List of known malicious URLs or domain patterns"
    )
    malicious_phone_numbers = models.JSONField(
        default=list,
        help_text="Reported phone numbers associated with this scam"
    )
    regex_patterns = models.JSONField(
        default=list,
        help_text="Regex patterns for advanced text matching"
    )

    # Source & Credibility
    source = models.CharField(
        max_length=20, choices=ThreatSource.choices, default=ThreatSource.MANUAL
    )
    source_url = models.URLField(max_length=2048, blank=True)
    credibility_score = models.DecimalField(
        max_digits=4, decimal_places=3, default=0.500,
        help_text="Confidence in this threat record (0-1)"
    )

    # Lifecycle
    is_active = models.BooleanField(default=True, db_index=True)
    is_verified = models.BooleanField(
        default=False,
        help_text="Manually verified by security analyst"
    )
    first_seen = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    reported_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times users have encountered this threat"
    )

    # AI Metadata
    ai_metadata = models.JSONField(
        default=dict,
        help_text="Additional AI-generated context for this threat"
    )

    class Meta:
        db_table = "threat_database"
        verbose_name = "Threat"
        verbose_name_plural = "Threat Database"
        ordering = ["-severity", "-reported_count"]
        indexes = [
            models.Index(fields=["category", "severity", "is_active"]),
            models.Index(fields=["is_active", "is_verified"]),
            # GIN index for fast JSON array search (keywords, URLs)
            # Only used with PostgreSQL; SQLite uses regular indexes.
            *([
                GinIndex(fields=["keywords"], name="idx_threat_keywords_gin"),
                GinIndex(fields=["malicious_urls"], name="idx_threat_urls_gin"),
            ] if _USE_GIN else [
                models.Index(fields=["severity"], name="idx_threat_severity"),
            ])
        ]

    def __str__(self):
        return f"[{self.category}] {self.title} (Severity: {self.severity})"

    def increment_reported_count(self):
        """Thread-safe increment of reported count."""
        ThreatDatabase.objects.filter(id=self.id).update(
            reported_count=models.F("reported_count") + 1
        )
