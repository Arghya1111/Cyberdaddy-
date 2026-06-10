"""
CyberDaddy - Threat Intelligence Admin
"""

from django.contrib import admin
from .models import ThreatDatabase


@admin.register(ThreatDatabase)
class ThreatDatabaseAdmin(admin.ModelAdmin):
    list_display = [
        "title", "category", "severity", "source",
        "is_active", "is_verified", "reported_count", "credibility_score", "created_at",
    ]
    list_filter = ["category", "severity", "source", "is_active", "is_verified"]
    search_fields = ["title", "description"]
    readonly_fields = ["id", "reported_count", "created_at", "updated_at"]
    ordering = ["-severity", "-reported_count"]
    list_per_page = 50

    fieldsets = (
        ("Identity", {"fields": ("id", "title", "description", "category", "severity")}),
        ("Matching Data", {"fields": ("keywords", "malicious_urls", "malicious_phone_numbers", "regex_patterns")}),
        ("Source & Credibility", {"fields": ("source", "source_url", "credibility_score", "is_verified")}),
        ("Lifecycle", {"fields": ("is_active", "first_seen", "last_seen", "reported_count")}),
        ("AI Metadata", {"fields": ("ai_metadata",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    actions = ["activate_threats", "deactivate_threats", "mark_as_verified"]

    def activate_threats(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} threats activated.")
    activate_threats.short_description = "Activate selected threats"

    def deactivate_threats(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} threats deactivated.")
    deactivate_threats.short_description = "Deactivate selected threats"

    def mark_as_verified(self, request, queryset):
        queryset.update(is_verified=True)
        self.message_user(request, f"{queryset.count()} threats marked as verified.")
    mark_as_verified.short_description = "Mark as verified"
