"""
CyberDaddy - Subscriptions Views, Serializers & URLs
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from drf_spectacular.utils import extend_schema

from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_limits = serializers.SerializerMethodField()
    remaining_scans = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "plan", "status", "billing_cycle",
            "started_at", "trial_ends_at",
            "current_period_start", "current_period_end",
            "scans_used_this_period", "scans_limit",
            "remaining_scans", "plan_limits",
            "payment_method", "last_payment_at", "next_payment_at",
        ]
        read_only_fields = [f for f in fields if f != "billing_cycle"]

    def get_plan_limits(self, obj):
        return obj.PLAN_LIMITS.get(obj.plan, {})


class SubscriptionDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/subscriptions/me/
    Returns current user's subscription details and plan limits.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer

    def get_object(self):
        sub, _ = Subscription.objects.get_or_create(
            user=self.request.user,
            defaults={"plan": Subscription.Plan.FREE}
        )
        return sub

    @extend_schema(tags=["Subscriptions"], summary="Get current subscription")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PlansListView(APIView):
    """
    GET /api/v1/subscriptions/plans/
    Returns all available subscription plans with pricing.
    Public endpoint — no authentication required.
    """
    permission_classes = []
    authentication_classes = []

    @extend_schema(tags=["Subscriptions"], summary="List available plans")
    def get(self, request):
        plans = [
            {
                "id": "free",
                "name": "Free",
                "price_monthly_inr": 0,
                "price_yearly_inr": 0,
                "features": {
                    "scans_per_month": 10,
                    "max_family_members": 0,
                    "ai_insights": False,
                    "priority_support": False,
                    "screenshot_scan": True,
                    "url_scan": True,
                },
            },
            {
                "id": "premium",
                "name": "Premium",
                "price_monthly_inr": 299,
                "price_yearly_inr": 2999,
                "features": {
                    "scans_per_month": 200,
                    "max_family_members": 0,
                    "ai_insights": True,
                    "priority_support": False,
                    "screenshot_scan": True,
                    "url_scan": True,
                    "weekly_report": True,
                },
            },
            {
                "id": "family",
                "name": "Family",
                "price_monthly_inr": 499,
                "price_yearly_inr": 4999,
                "features": {
                    "scans_per_month": 500,
                    "max_family_members": 10,
                    "ai_insights": True,
                    "priority_support": True,
                    "screenshot_scan": True,
                    "url_scan": True,
                    "family_dashboard": True,
                    "weekly_report": True,
                    "real_time_family_alerts": True,
                },
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price_monthly_inr": None,  # Custom pricing
                "price_yearly_inr": None,
                "features": {
                    "scans_per_month": "unlimited",
                    "max_seats": "custom",
                    "ai_insights": True,
                    "priority_support": True,
                    "dedicated_account_manager": True,
                    "custom_integrations": True,
                    "sla_99_9": True,
                },
            },
        ]
        return Response({"plans": plans})


class CancelSubscriptionView(APIView):
    """
    POST /api/v1/subscriptions/cancel/
    Cancel subscription at end of current billing period.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Subscriptions"], summary="Cancel subscription")
    def post(self, request):
        try:
            subscription = request.user.subscription
            if subscription.plan == Subscription.Plan.FREE:
                return Response(
                    {"success": False, "error": {"message": "Free plan cannot be cancelled."}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            from django.utils import timezone
            subscription.status = Subscription.SubscriptionStatus.CANCELLED
            subscription.cancelled_at = timezone.now()
            subscription.save(update_fields=["status", "cancelled_at"])

            return Response({
                "success": True,
                "message": "Subscription cancelled. Access continues until end of billing period.",
                "access_until": subscription.current_period_end,
            })
        except Exception as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )
