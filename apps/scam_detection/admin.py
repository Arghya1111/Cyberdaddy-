"""
CyberDaddy - Scam Detection Admin
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import ScanHistory, ThreatScanMatch


class ThreatScanMatchInline(admin.TabularInline):
    model = ThreatScanMatch
    extra = 0
    readonly_fields = ["threat", "confidence_score", "match_method", "matched_text"]
    can_delete = False


@admin.register(ScanHistory)
class ScanHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "id_short", "user", "scan_type", "status",
        "risk_level_badge", "risk_score", "is_threat",
        "scam_category", "processing_time_ms", "created_at",
    ]
    list_filter = ["scan_type", "status", "risk_level", "is_threat", "scam_category", "created_at"]
    search_fields = ["user__email", "scan_input_text", "scan_input_url", "scam_category"]
    readonly_fields = [
        "id", "celery_task_id", "ai_response", "processing_time_ms",
        "risk_score", "risk_level", "is_threat", "created_at",
    ]
    inlines = [ThreatScanMatchInline]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    def id_short(self, obj):
        return str(obj.id)[:8] + "..."
    id_short.short_description = "ID"

    def risk_level_badge(self, obj):
        colors = {
            "safe": "green", "low": "blue", "medium": "orange",
            "high": "red", "critical": "darkred",
        }
        color = colors.get(obj.risk_level, "gray")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_risk_level_display() or "—"
        )
    risk_level_badge.short_description = "Risk"


@admin.register(ThreatScanMatch)
class ThreatScanMatchAdmin(admin.ModelAdmin):
    list_display = ["scan", "threat", "confidence_score", "match_method", "created_at"]
    list_filter = ["match_method"]
    readonly_fields = ["id", "created_at"]
