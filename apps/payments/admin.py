"""
CyberDaddy - Payments Admin
"""

from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id", "user", "gateway", "payment_type", "status",
        "amount_display", "currency", "paid_at", "created_at",
    ]
    list_filter = ["gateway", "status", "payment_type", "currency"]
    search_fields = ["user__email", "gateway_payment_id", "gateway_order_id"]
    readonly_fields = [
        "id", "created_at", "updated_at",
        "gateway_payment_id", "gateway_order_id",
        "gateway_response", "webhook_event_id",
    ]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    def amount_display(self, obj):
        return f"₹{obj.amount_display:.2f}"
    amount_display.short_description = "Amount"

    def has_delete_permission(self, request, obj=None):
        # Payment records are immutable — never allow deletion from admin
        return False
