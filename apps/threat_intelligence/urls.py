"""
CyberDaddy - Threat Intelligence URLs
"""

from django.urls import path
from .views import ThreatListView, ThreatDetailView, ThreatSearchView, ThreatStatsView

app_name = "threats"

urlpatterns = [
    path("", ThreatListView.as_view(), name="threat-list"),
    path("stats/", ThreatStatsView.as_view(), name="threat-stats"),
    path("search/", ThreatSearchView.as_view(), name="threat-search"),
    path("<uuid:pk>/", ThreatDetailView.as_view(), name="threat-detail"),
]
