"""
CyberDaddy - Notifications Models
============================================================
Table: notifications

Design:
- Unified notification model for all channels (push, email, SMS)
- Family alerts are special-cased for family dashboard
- Critical threat alerts bypass quiet hours
- Notification status tracked for delivery confirmation
"""

from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """
    Stores every notification sent to a user.
    Provides a notification inbox in the app.
    """

    class NotificationType(models.TextChoices):
        THREAT_ALERT = "threat_alert", "Threat Alert"
        SCAN_COMPLETE = "scan_complete", "Scan Complete"
        FAMILY_ALERT = "family_alert", "Family Alert"
        WEEKLY_REPORT = "weekly_report", "Weekly Safety Report"
        SUBSCRIPTION = "subscription", "Subscription Update"
        PAYMENT = "payment", "Payment Notification"
        SYSTEM = "system", "System Notification"
        WELCOME = "welcome", "Welcome Message"

    class Channel(models.TextChoices):
        PUSH = "push", "Push Notification"
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        IN_APP = "in_app", "In-App"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"  # Bypasses quiet hours

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"
        READ = "read", "Read"

    # Recipient
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    # Content
    notification_type = models.CharField(
        max_length=20, choices=NotificationType.choices, db_index=True
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    data = models.JSONField(
        default=dict,
        help_text="Additional data payload (e.g., scan_id, threat_id for deep links)"
    )

    # Channel & Priority
    channel = models.CharField(max_length=10, choices=Channel.choices, db_index=True)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL
    )

    # Status Tracking
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    failed_reason = models.TextField(blank=True)

    # Related Objects (for linking to the event that triggered the notification)
    related_scan_id = models.UUIDField(null=True, blank=True)
    related_threat_id = models.UUIDField(null=True, blank=True)
    related_family_member_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
            models.Index(fields=["user", "channel", "notification_type"]),
            models.Index(fields=["priority", "status"]),
        ]

    def __str__(self):
        return f"[{self.channel}] {self.user.email} — {self.title}"

    def mark_as_read(self):
        from django.utils import timezone
        self.status = self.Status.READ
        self.read_at = timezone.now()
        self.save(update_fields=["status", "read_at"])
