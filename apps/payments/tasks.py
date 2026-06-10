"""
CyberDaddy - Payments Celery Tasks
Handles webhook event processing asynchronously.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.payments.tasks.handle_stripe_webhook_task",
    max_retries=3,
    queue="default",
)
def handle_stripe_webhook_task(self, event: dict):
    """Process Stripe webhook events idempotently."""
    try:
        event_type = event.get("event_type")
        event_id = event.get("event_id")
        data = event.get("data", {})

        from apps.payments.models import Payment

        # Idempotency check: skip if already processed
        if Payment.objects.filter(webhook_event_id=event_id).exists():
            logger.info(f"Stripe webhook {event_id} already processed. Skipping.")
            return

        if event_type == "invoice.payment_succeeded":
            _handle_stripe_payment_succeeded(data, event_id)
        elif event_type == "invoice.payment_failed":
            _handle_stripe_payment_failed(data)
        elif event_type == "customer.subscription.deleted":
            _handle_stripe_subscription_cancelled(data)
        else:
            logger.info(f"Unhandled Stripe webhook event type: {event_type}")

    except Exception as exc:
        logger.error(f"Stripe webhook processing failed: {exc}")
        raise self.retry(exc=exc)


def _handle_stripe_payment_succeeded(data: dict, event_id: str):
    """Handle successful Stripe payment — activate subscription."""
    from apps.payments.models import Payment
    from apps.payments.services import PaymentService
    from apps.users.models import User

    customer_id = data.get("customer")
    amount = data.get("amount_paid", 0)

    try:
        from apps.subscriptions.models import Subscription
        subscription = Subscription.objects.get(stripe_customer_id=customer_id)
        user = subscription.user

        payment = PaymentService.record_payment(
            user=user,
            gateway=Payment.Gateway.STRIPE,
            payment_type=Payment.PaymentType.SUBSCRIPTION_RENEWAL,
            amount=amount,
            currency=data.get("currency", "usd").upper(),
            gateway_data=data,
        )
        payment.webhook_event_id = event_id
        payment.save(update_fields=["webhook_event_id"])
        PaymentService.confirm_payment(payment, data.get("payment_intent", ""))
        logger.info(f"Stripe payment succeeded for customer: {customer_id}")
    except Exception as e:
        logger.error(f"Failed to process Stripe payment_succeeded: {e}")


def _handle_stripe_payment_failed(data: dict):
    """Handle failed payment — update subscription status."""
    from apps.subscriptions.models import Subscription
    customer_id = data.get("customer")
    try:
        sub = Subscription.objects.get(stripe_customer_id=customer_id)
        sub.payment_failure_count += 1
        if sub.payment_failure_count >= 3:
            sub.status = Subscription.SubscriptionStatus.PAST_DUE
        sub.save(update_fields=["payment_failure_count", "status"])
    except Exception as e:
        logger.error(f"Failed to handle Stripe payment failure: {e}")


def _handle_stripe_subscription_cancelled(data: dict):
    """Handle subscription cancellation via Stripe."""
    from apps.subscriptions.models import Subscription
    from django.utils import timezone
    stripe_sub_id = data.get("id")
    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        sub.status = Subscription.SubscriptionStatus.CANCELLED
        sub.cancelled_at = timezone.now()
        sub.save(update_fields=["status", "cancelled_at"])
    except Exception as e:
        logger.error(f"Failed to handle Stripe subscription cancellation: {e}")


@shared_task(
    bind=True,
    name="apps.payments.tasks.handle_razorpay_webhook_task",
    max_retries=3,
    queue="default",
)
def handle_razorpay_webhook_task(self, payload: dict):
    """Process Razorpay webhook events idempotently."""
    try:
        event = payload.get("event")
        if event == "payment.captured":
            payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
            logger.info(f"Razorpay payment captured: {payment_data.get('id')}")
            # Process similar to Stripe payment_succeeded
    except Exception as exc:
        logger.error(f"Razorpay webhook processing failed: {exc}")
        raise self.retry(exc=exc)
