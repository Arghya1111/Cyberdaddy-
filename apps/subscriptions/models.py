"""
CyberDaddy - Subscriptions Models
============================================================
Table: subscriptions

Design:
- One subscription per user (one-to-one)
- Plan limits enforced by service layer (scan counts, family members)
- Trial period support with automatic downgrade
- Billing status tracks payment health
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel


class Subscription(TimeStampedModel):
    """
    Manages a user's subscription plan, lifecycle, and limits.
    """

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PREMIUM = "premium", "Premium"
        FAMILY = "family", "Family"
        ENTERPRISE = "enterprise", "Enterprise"

    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"
        LIFETIME = "lifetime", "Lifetime"

    class SubscriptionStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        TRIAL = "trial", "Trial"
        PAST_DUE = "past_due", "Past Due"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"
        PAUSED = "paused", "Paused"

    # Relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription"
    )

    # Plan
    plan = models.CharField(
        max_length=20, choices=Plan.choices, default=Plan.FREE, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE, db_index=True
    )
    billing_cycle = models.CharField(
        max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY
    )

    # Dates
    started_at = models.DateTimeField(default=timezone.now)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Usage Tracking
    scans_used_this_period = models.PositiveIntegerField(default=0)
    scans_limit = models.PositiveIntegerField(
        default=10,
        help_text="Scans allowed per billing period (0 = unlimited)"
    )

    # External Payment IDs
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    razorpay_subscription_id = models.CharField(max_length=255, blank=True)
    razorpay_customer_id = models.CharField(max_length=255, blank=True)

    # Payment Health
    payment_method = models.CharField(
        max_length=20,
        choices=[("stripe", "Stripe"), ("razorpay", "Razorpay"), ("none", "None")],
        default="none"
    )
    last_payment_at = models.DateTimeField(null=True, blank=True)
    next_payment_at = models.DateTimeField(null=True, blank=True)
    payment_failure_count = models.PositiveIntegerField(default=0)

    # Enterprise Metadata
    enterprise_seats = models.PositiveIntegerField(
        default=0,
        help_text="Number of enterprise user seats"
    )
    enterprise_domain = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "subscriptions"
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        indexes = [
            models.Index(fields=["status", "current_period_end"]),
            models.Index(fields=["plan", "status"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.plan} ({self.status})"

    # ---- Plan Limits ----
    PLAN_LIMITS = {
        Plan.FREE: {
            "scans_per_month": 10,
            "max_family_members": 0,
            "ai_insights": False,
            "priority_support": False,
        },
        Plan.PREMIUM: {
            "scans_per_month": 200,
            "max_family_members": 0,
            "ai_insights": True,
            "priority_support": False,
        },
        Plan.FAMILY: {
            "scans_per_month": 500,
            "max_family_members": 10,
            "ai_insights": True,
            "priority_support": True,
        },
        Plan.ENTERPRISE: {
            "scans_per_month": 0,  # Unlimited
            "max_family_members": 0,  # Uses enterprise_seats
            "ai_insights": True,
            "priority_support": True,
        },
    }

    def get_plan_limit(self, limit_key: str):
        return self.PLAN_LIMITS.get(self.plan, {}).get(limit_key)

    @property
    def is_active(self):
        return self.status in [
            self.SubscriptionStatus.ACTIVE, self.SubscriptionStatus.TRIAL
        ]

    @property
    def has_scans_remaining(self):
        limit = self.get_plan_limit("scans_per_month")
        if limit == 0:  # Unlimited
            return True
        return self.scans_used_this_period < limit

    @property
    def remaining_scans(self):
        limit = self.get_plan_limit("scans_per_month")
        if limit == 0:
            return float("inf")
        return max(0, limit - self.scans_used_this_period)

    def increment_scan_count(self):
        """Thread-safe scan counter increment."""
        Subscription.objects.filter(id=self.id).update(
            scans_used_this_period=models.F("scans_used_this_period") + 1
        )
