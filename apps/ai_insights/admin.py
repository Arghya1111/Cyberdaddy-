"""
CyberDaddy - AI Insights Admin
"""

from django.contrib import admin
from .models import AIInsight


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = [
        "user", "safety_score", "safety_score_trend",
        "risk_profile", "total_scans", "total_threats_detected",
        "last_analyzed_at", "updated_at",
    ]
    list_filter = ["risk_profile", "safety_score_trend"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "updated_at", "last_analyzed_at"]
    ordering = ["-safety_score"]
