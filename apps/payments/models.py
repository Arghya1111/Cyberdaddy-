"""
CyberDaddy - Payments Models
============================================================
Table: payments

Design:
- Gateway-agnostic: supports Stripe + Razorpay
- Immutable transaction log (no soft deletes — financial records are sacred)
- Webhook events stored for idempotency (prevent duplicate processing)
- Payment method details stored in JSONField (no raw card data ever)
"""

from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Payment(TimeStampedModel):
    """
    Immutable record of every payment transaction.
    Never modify a payment record after it's created — create a new one.
    """

    class Gateway(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        RAZORPAY = "razorpay", "Razorpay"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially Refunded"
        DISPUTED = "disputed", "Disputed"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentType(models.TextChoices):
        SUBSCRIPTION_NEW = "subscription_new", "New Subscription"
        SUBSCRIPTION_RENEWAL = "subscription_renewal", "Subscription Renewal"
        SUBSCRIPTION_UPGRADE = "subscription_upgrade", "Plan Upgrade"
        REFUND = "refund", "Refund"

    # Relationships
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,  # Never cascade-delete payment records
        related_name="payments",
    )
    subscription = models.ForeignKey(
        "subscriptions.Subscription",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments",
    )

    # Payment Details
    gateway = models.CharField(max_length=20, choices=Gateway.choices, db_index=True)
    payment_type = models.CharField(max_length=30, choices=PaymentType.choices)
    status = models.CharField(
        max_length=25, choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING, db_index=True
    )

    # Amount (always store in smallest currency unit)
    amount = models.PositiveBigIntegerField(
        help_text="Amount in smallest currency unit (e.g., paise for INR, cents for USD)"
    )
    currency = models.CharField(max_length=3, default="INR")
    amount_refunded = models.PositiveBigIntegerField(default=0)

    # Gateway-Specific IDs
    gateway_payment_id = models.CharField(
        max_length=255, blank=True, db_index=True,
        help_text="Stripe PaymentIntent ID or Razorpay payment_id"
    )
    gateway_order_id = models.CharField(
        max_length=255, blank=True,
        help_text="Razorpay order_id or Stripe checkout session ID"
    )
    gateway_invoice_id = models.CharField(max_length=255, blank=True)

    # Payment Method Info (no raw card data — store only metadata)
    payment_method_type = models.CharField(
        max_length=20,
        choices=[("card", "Card"), ("upi", "UPI"), ("netbanking", "Net Banking"), ("wallet", "Wallet")],
        blank=True,
    )
    payment_method_last4 = models.CharField(max_length=4, blank=True)
    payment_method_brand = models.CharField(max_length=20, blank=True)

    # Raw Gateway Response (for auditing and debugging)
    gateway_response = models.JSONField(
        default=dict,
        help_text="Full webhook payload from payment gateway"
    )

    # Webhook Processing
    webhook_event_id = models.CharField(
        max_length=255, blank=True, unique=True,
        null=True,
        help_text="Gateway webhook event ID for idempotency"
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    description = models.CharField(max_length=500, blank=True)
    error_code = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "payments"
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
            models.Index(fields=["gateway", "status"]),
            models.Index(fields=["gateway_payment_id"]),
        ]

    def __str__(self):
        return f"Payment #{self.id} — {self.user.email} — {self.amount/100:.2f} {self.currency} ({self.status})"

    @property
    def amount_display(self):
        """Return amount in major currency unit."""
        return self.amount / 100
