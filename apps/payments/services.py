"""
CyberDaddy - Payments Service Layer
Handles Stripe and Razorpay payment flows.
"""

import logging
import stripe
import razorpay
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class StripeService:
    """Stripe payment gateway integration."""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_subscription(self, user, plan: str, billing_cycle: str) -> dict:
        """Create a Stripe subscription for the user."""
        from apps.subscriptions.models import Subscription
        from apps.payments.models import Payment

        # Map plan + cycle to Stripe Price ID (configure in Stripe dashboard)
        PRICE_IDS = {
            ("premium", "monthly"): settings.STRIPE_PRICE_PREMIUM_MONTHLY,
            ("premium", "yearly"): settings.STRIPE_PRICE_PREMIUM_YEARLY,
            ("family", "monthly"): settings.STRIPE_PRICE_FAMILY_MONTHLY,
            ("family", "yearly"): settings.STRIPE_PRICE_FAMILY_YEARLY,
        }
        price_id = PRICE_IDS.get((plan, billing_cycle))
        if not price_id:
            raise ValueError(f"Invalid plan/cycle combination: {plan}/{billing_cycle}")

        try:
            subscription = user.subscription
        except Exception:
            raise ValueError("User does not have a subscription record")

        # Create or retrieve Stripe customer
        if subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={"cyberdaddy_user_id": str(user.id)},
            )
            customer_id = customer.id
            subscription.stripe_customer_id = customer_id
            subscription.save(update_fields=["stripe_customer_id"])

        # Create Stripe subscription
        stripe_sub = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            metadata={"cyberdaddy_user_id": str(user.id), "plan": plan},
        )

        return {
            "subscription_id": stripe_sub.id,
            "client_secret": stripe_sub.latest_invoice.payment_intent.client_secret,
            "status": stripe_sub.status,
        }

    def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Verify and process Stripe webhook events."""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Stripe webhook signature verification failed: {e}")
            raise ValueError("Invalid webhook signature")

        return {"event_id": event.id, "event_type": event.type, "data": event.data.object}


class RazorpayService:
    """Razorpay payment gateway integration (primary for India)."""

    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(self, amount_inr: float, currency: str = "INR", notes: dict = None) -> dict:
        """Create a Razorpay order for one-time or subscription payment."""
        amount_paise = int(amount_inr * 100)  # Convert to paise
        order_data = {
            "amount": amount_paise,
            "currency": currency,
            "notes": notes or {},
        }
        order = self.client.order.create(data=order_data)
        return order

    def verify_payment(self, razorpay_order_id: str, razorpay_payment_id: str, signature: str) -> bool:
        """Verify Razorpay payment signature to confirm authenticity."""
        try:
            self.client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": signature,
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

    def handle_webhook(self, payload: bytes, signature: str) -> dict:
        """Verify and parse Razorpay webhook."""
        import hmac
        import hashlib
        import json

        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            raise ValueError("Invalid Razorpay webhook signature")

        return json.loads(payload)


class PaymentService:
    """Orchestrates payment creation and recording."""

    @staticmethod
    def record_payment(user, gateway: str, payment_type: str, amount: int,
                       currency: str, gateway_data: dict) -> "Payment":
        """Create an immutable payment record."""
        from apps.payments.models import Payment

        payment = Payment.objects.create(
            user=user,
            gateway=gateway,
            payment_type=payment_type,
            status=Payment.PaymentStatus.PENDING,
            amount=amount,
            currency=currency,
            gateway_response=gateway_data,
        )
        return payment

    @staticmethod
    def confirm_payment(payment, gateway_payment_id: str, payment_method_info: dict = None) -> "Payment":
        """Confirm a payment after successful gateway response."""
        payment.status = payment.PaymentStatus.SUCCEEDED
        payment.gateway_payment_id = gateway_payment_id
        payment.paid_at = timezone.now()
        if payment_method_info:
            payment.payment_method_type = payment_method_info.get("type", "")
            payment.payment_method_last4 = payment_method_info.get("last4", "")
            payment.payment_method_brand = payment_method_info.get("brand", "")
        payment.save()

        # Activate subscription
        PaymentService._activate_subscription(payment)
        return payment

    @staticmethod
    def _activate_subscription(payment):
        """Activate/upgrade subscription after payment confirmation."""
        from apps.subscriptions.models import Subscription
        from datetime import timedelta

        try:
            subscription = payment.user.subscription
            subscription.status = Subscription.SubscriptionStatus.ACTIVE
            subscription.last_payment_at = timezone.now()
            now = timezone.now()
            subscription.current_period_start = now

            if subscription.billing_cycle == Subscription.BillingCycle.MONTHLY:
                subscription.current_period_end = now + timedelta(days=30)
            elif subscription.billing_cycle == Subscription.BillingCycle.YEARLY:
                subscription.current_period_end = now + timedelta(days=365)

            subscription.scans_used_this_period = 0  # Reset scan counter
            subscription.save()
        except Exception as e:
            logger.error(f"Failed to activate subscription after payment: {e}")
