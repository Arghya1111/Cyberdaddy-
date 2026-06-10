"""
CyberDaddy - Notifications Admin
"""

from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "title", "user", "notification_type", "channel",
        "priority", "status", "sent_at", "created_at",
    ]
    list_filter = ["notification_type", "channel", "priority", "status", "created_at"]
    search_fields = ["user__email", "title", "body"]
    readonly_fields = [
        "id", "created_at", "updated_at",
        "sent_at", "delivered_at", "read_at",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
