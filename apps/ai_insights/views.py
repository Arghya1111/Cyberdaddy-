"""
CyberDaddy - AI Insights Views, Serializers & URLs
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from .models import AIInsight


class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = [
            "id",
            "safety_score", "safety_score_trend", "risk_profile",
            "total_scans", "total_threats_detected", "threats_blocked_this_month",
            "threat_frequency_score",
            "top_scam_categories",
            "weekly_scan_trend", "monthly_safety_trend",
            "recommendations", "personalized_tips",
            "scam_categories_breakdown",
            "ai_narrative",
            "last_analyzed_at", "updated_at",
        ]


class AIInsightDashboardView(APIView):
    """
    GET /api/v1/insights/dashboard/
    Returns full AI safety dashboard for the current user.
    Cached for 30 minutes.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Insights"], summary="Get AI safety insights dashboard")
    def get(self, request):
        cache_key = f"ai_insights_{request.user.id}"
        data = cache.get(cache_key)

        if not data:
            insight, _ = AIInsight.objects.get_or_create(
                user=request.user,
                defaults={"safety_score": 100.00}
            )
            data = AIInsightSerializer(insight).data
            cache.set(cache_key, data, timeout=1800)

        return Response(data)


class SafetyScoreView(APIView):
    """
    GET /api/v1/insights/safety-score/
    Returns just the current safety score (lightweight, frequently polled).
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Insights"], summary="Get current safety score")
    def get(self, request):
        cache_key = f"safety_score_{request.user.id}"
        score_data = cache.get(cache_key)

        if not score_data:
            score_data = {
                "safety_score": float(request.user.safety_score),
                "risk_profile": "very_safe",
            }
            try:
                insight = request.user.ai_insights
                score_data["safety_score"] = float(insight.safety_score)
                score_data["risk_profile"] = insight.risk_profile
                score_data["safety_score_trend"] = insight.safety_score_trend
            except AIInsight.DoesNotExist:
                pass

            cache.set(cache_key, score_data, timeout=300)

        return Response(score_data)


class ThreatTrendsView(APIView):
    """
    GET /api/v1/insights/trends/
    Returns scam trend data for chart visualization.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Insights"], summary="Get scam threat trends")
    def get(self, request):
        try:
            insight = request.user.ai_insights
            return Response({
                "weekly_scan_trend": insight.weekly_scan_trend,
                "monthly_safety_trend": insight.monthly_safety_trend,
                "scam_categories_breakdown": insight.scam_categories_breakdown,
                "top_scam_categories": insight.top_scam_categories,
            })
        except AIInsight.DoesNotExist:
            return Response({
                "weekly_scan_trend": [],
                "monthly_safety_trend": [],
                "scam_categories_breakdown": {},
                "top_scam_categories": [],
            })


class RecommendationsView(APIView):
    """
    GET /api/v1/insights/recommendations/
    Returns personalized AI safety recommendations.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Insights"], summary="Get personalized recommendations")
    def get(self, request):
        try:
            insight = request.user.ai_insights
            return Response({
                "recommendations": insight.recommendations,
                "personalized_tips": insight.personalized_tips,
                "ai_narrative": insight.ai_narrative,
                "last_analyzed_at": insight.last_analyzed_at,
            })
        except AIInsight.DoesNotExist:
            return Response({
                "recommendations": [],
                "personalized_tips": ["Start scanning messages to get personalized safety tips."],
                "ai_narrative": "",
                "last_analyzed_at": None,
            })
