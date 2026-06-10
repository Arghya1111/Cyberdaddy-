"""
CyberDaddy - AI Insights Models
============================================================
Table: ai_insights

Design:
- One insights record per user (updated periodically by Celery)
- Safety score aggregated from all scans and threat encounters
- Trend data stored in JSONField (time-series arrays for charts)
- Recommendations personalized using AI analysis of user's scan history
"""

from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class AIInsight(TimeStampedModel):
    """
    Stores aggregated AI-generated insights and analytics for each user.
    Updated daily by Celery Beat task based on recent scan activity.
    """

    # Relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_insights"
    )

    # Safety Score (0-100, higher = safer)
    safety_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text="Current AI-calculated safety score"
    )
    safety_score_trend = models.CharField(
        max_length=10,
        choices=[("up", "Improving"), ("down", "Declining"), ("stable", "Stable")],
        default="stable"
    )

    # Threat Statistics
    total_scans = models.PositiveIntegerField(default=0)
    total_threats_detected = models.PositiveIntegerField(default=0)
    threats_blocked_this_month = models.PositiveIntegerField(default=0)
    threat_frequency_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        help_text="Average threats encountered per week"
    )

    # Most Common Scam Categories (for personalized warnings)
    top_scam_categories = models.JSONField(
        default=list,
        help_text="Ranked list of scam categories this user encounters most"
    )

    # Weekly Trend Data (for charts — stored as time-series arrays)
    weekly_scan_trend = models.JSONField(
        default=list,
        help_text="[{week: 'YYYY-WW', scans: N, threats: N}, ...] for the past 12 weeks"
    )
    monthly_safety_trend = models.JSONField(
        default=list,
        help_text="[{month: 'YYYY-MM', safety_score: N}, ...] for the past 6 months"
    )

    # AI-Generated Recommendations
    recommendations = models.JSONField(
        default=list,
        help_text="Personalized safety recommendations from AI analysis"
    )
    personalized_tips = models.JSONField(
        default=list,
        help_text="Behavioral safety tips tailored to this user's threat profile"
    )

    # Risk Profile
    risk_profile = models.CharField(
        max_length=20,
        choices=[
            ("very_safe", "Very Safe"),
            ("safe", "Safe"),
            ("moderate", "Moderate Risk"),
            ("high_risk", "High Risk"),
            ("critical", "Critical"),
        ],
        default="very_safe"
    )

    # Scam Categories Summary (for dashboard pie chart)
    scam_categories_breakdown = models.JSONField(
        default=dict,
        help_text="Category → count breakdown of all detected scams"
    )

    # AI Full Analysis (last generated)
    ai_narrative = models.TextField(
        blank=True,
        help_text="Full AI-written safety narrative for the user's weekly report"
    )
    last_analyzed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_insights"
        verbose_name = "AI Insight"
        verbose_name_plural = "AI Insights"
        indexes = [
            models.Index(fields=["safety_score", "risk_profile"]),
        ]

    def __str__(self):
        return f"Insights for {self.user.email} — Score: {self.safety_score}"
