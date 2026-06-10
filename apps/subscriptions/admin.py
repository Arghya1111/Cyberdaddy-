"""
CyberDaddy - Subscriptions Admin
"""

from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user", "plan", "status", "billing_cycle",
        "scans_used_this_period", "scans_limit",
        "current_period_end", "payment_method",
    ]
    list_filter = ["plan", "status", "billing_cycle", "payment_method"]
    search_fields = ["user__email", "stripe_subscription_id", "razorpay_subscription_id"]
    readonly_fields = ["id", "created_at", "updated_at", "started_at"]

    actions = ["reset_scan_counter"]

    def reset_scan_counter(self, request, queryset):
        queryset.update(scans_used_this_period=0)
        self.message_user(request, f"Reset scan counter for {queryset.count()} subscriptions.")
    reset_scan_counter.short_description = "Reset scan counter"
