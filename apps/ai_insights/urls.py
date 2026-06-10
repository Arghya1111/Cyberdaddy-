"""
CyberDaddy - AI Insights URLs
"""

from django.urls import path
from .views import (
    AIInsightDashboardView, SafetyScoreView,
    ThreatTrendsView, RecommendationsView,
)

app_name = "insights"

urlpatterns = [
    path("dashboard/", AIInsightDashboardView.as_view(), name="dashboard"),
    path("safety-score/", SafetyScoreView.as_view(), name="safety-score"),
    path("trends/", ThreatTrendsView.as_view(), name="trends"),
    path("recommendations/", RecommendationsView.as_view(), name="recommendations"),
]
