"""
CyberDaddy - Scam Detection URLs
"""

from django.urls import path
from .views import (
    SubmitTextScanView, SubmitScreenshotScanView,
    ScanDetailView, ScanHistoryListView, ScanStatsView,
)

app_name = "scans"

urlpatterns = [
    # Scan Submission
    path("text/", SubmitTextScanView.as_view(), name="submit-text-scan"),
    path("screenshot/", SubmitScreenshotScanView.as_view(), name="submit-screenshot-scan"),

    # Scan Results
    path("history/", ScanHistoryListView.as_view(), name="scan-history"),
    path("stats/", ScanStatsView.as_view(), name="scan-stats"),
    path("<uuid:pk>/", ScanDetailView.as_view(), name="scan-detail"),
]
