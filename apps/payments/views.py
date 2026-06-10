"""
CyberDaddy - Payment Views
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, generics
from drf_spectacular.utils import extend_schema

from .models import Payment
from .services import StripeService, RazorpayService, PaymentService
from apps.core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class CreateStripeSubscriptionView(APIView):
    """POST /api/v1/payments/stripe/subscribe/"""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Payments"], summary="Create Stripe subscription")
    def post(self, request):
        plan = request.data.get("plan")
        billing_cycle = request.data.get("billing_cycle", "monthly")

        if plan not in ["premium", "family", "enterprise"]:
            return Response(
                {"success": False, "error": {"message": "Invalid plan."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            svc = StripeService()
            result = svc.create_subscription(request.user, plan, billing_cycle)
            return Response({"success": True, **result})
        except Exception as e:
            logger.error(f"Stripe subscription failed: {e}")
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CreateRazorpayOrderView(APIView):
    """POST /api/v1/payments/razorpay/order/"""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Payments"], summary="Create Razorpay order")
    def post(self, request):
        plan = request.data.get("plan")
        billing_cycle = request.data.get("billing_cycle", "monthly")

        # Plan → Amount mapping (in INR)
        PLAN_PRICES = {
            ("premium", "monthly"): 299,
            ("premium", "yearly"): 2999,
            ("family", "monthly"): 499,
            ("family", "yearly"): 4999,
        }
        amount = PLAN_PRICES.get((plan, billing_cycle))
        if not amount:
            return Response(
                {"success": False, "error": {"message": "Invalid plan/billing cycle."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            svc = RazorpayService()
            order = svc.create_order(
                amount_inr=amount,
                notes={"user_id": str(request.user.id), "plan": plan}
            )
            return Response({
                "success": True,
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "razorpay_key": __import__("django.conf", fromlist=["settings"]).settings.RAZORPAY_KEY_ID,
            })
        except Exception as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )


class VerifyRazorpayPaymentView(APIView):
    """POST /api/v1/payments/razorpay/verify/"""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Payments"], summary="Verify Razorpay payment")
    def post(self, request):
        order_id = request.data.get("razorpay_order_id")
        payment_id = request.data.get("razorpay_payment_id")
        signature = request.data.get("razorpay_signature")

        if not all([order_id, payment_id, signature]):
            return Response(
                {"success": False, "error": {"message": "Missing payment details."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        svc = RazorpayService()
        if not svc.verify_payment(order_id, payment_id, signature):
            return Response(
                {"success": False, "error": {"message": "Payment verification failed."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Record payment and activate subscription
        payment = PaymentService.record_payment(
            user=request.user,
            gateway=Payment.Gateway.RAZORPAY,
            payment_type=Payment.PaymentType.SUBSCRIPTION_NEW,
            amount=request.data.get("amount", 0),
            currency="INR",
            gateway_data={"order_id": order_id, "payment_id": payment_id},
        )
        PaymentService.confirm_payment(payment, payment_id)

        return Response({"success": True, "message": "Payment verified and subscription activated."})


class StripeWebhookView(APIView):
    """POST /api/v1/payments/stripe/webhook/"""
    permission_classes = [AllowAny]
    authentication_classes = []  # Stripe sends unsigned requests

    @extend_schema(tags=["Payments"], summary="Stripe webhook handler", exclude=True)
    def post(self, request):
        sig_header = request.headers.get("Stripe-Signature", "")
        try:
            svc = StripeService()
            event = svc.handle_webhook(request.body, sig_header)
            # Handle specific events
            from apps.payments.tasks import handle_stripe_webhook_task
            from django.conf import settings as _settings
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    handle_stripe_webhook_task(event)
                except Exception as exc:
                    logger.warning(f"Stripe webhook task failed: {exc}")
            else:
                handle_stripe_webhook_task.delay(event)
            return Response({"received": True})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RazorpayWebhookView(APIView):
    """POST /api/v1/payments/razorpay/webhook/"""
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Payments"], summary="Razorpay webhook handler", exclude=True)
    def post(self, request):
        signature = request.headers.get("X-Razorpay-Signature", "")
        try:
            svc = RazorpayService()
            payload = svc.handle_webhook(request.body, signature)
            from apps.payments.tasks import handle_razorpay_webhook_task
            from django.conf import settings as _settings
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    handle_razorpay_webhook_task(payload)
                except Exception as exc:
                    logger.warning(f"Razorpay webhook task failed: {exc}")
            else:
                handle_razorpay_webhook_task.delay(payload)
            return Response({"received": True})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentHistoryView(generics.ListAPIView):
    """GET /api/v1/payments/history/"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        from rest_framework import serializers
        return Payment.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        from rest_framework import serializers

        class PaymentSerializer(serializers.ModelSerializer):
            class Meta:
                model = Payment
                fields = [
                    "id", "gateway", "payment_type", "status",
                    "amount", "currency", "paid_at", "created_at",
                ]
        return PaymentSerializer

    @extend_schema(tags=["Payments"], summary="Payment transaction history")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
