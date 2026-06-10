"""
CyberDaddy - Scam Detection Views
"""

import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from drf_spectacular.utils import extend_schema

from .models import ScanHistory
from .serializers import (
    ScanHistorySerializer, ScanHistoryListSerializer,
    SubmitTextScanSerializer, SubmitScreenshotScanSerializer,
)
from .services import ScanService
from apps.core.permissions import IsEmailVerified, HasScanQuota, IsScanOwner
from apps.core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class SubmitTextScanView(APIView):
    """
    POST /api/v1/scans/text/
    Submit a text-based scan (SMS, URL, Email, Phone Number).
    Returns immediately with scan ID; result fetched via GET /scans/<id>/
    """
    permission_classes = [IsAuthenticated, IsEmailVerified, HasScanQuota]

    @extend_schema(tags=["Scans"], summary="Submit text scan (SMS/URL/Email)")
    def post(self, request):
        serializer = SubmitTextScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scan_type = serializer.validated_data["scan_type"]
        content = serializer.validated_data["content"]

        kwargs = {}
        if scan_type == "url":
            kwargs["scan_input_url"] = content
        else:
            kwargs["scan_input_text"] = content

        scan = ScanService.create_scan(request.user, scan_type, **kwargs)

        return Response(
            {
                "success": True,
                "scan_id": str(scan.id),
                "status": scan.status,
                "message": "Scan submitted. Fetch result using the scan_id.",
                "result_url": f"/api/v1/scans/{scan.id}/",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class SubmitScreenshotScanView(APIView):
    """
    POST /api/v1/scans/screenshot/
    Upload a screenshot for AI scam detection (GPT-4o Vision).
    """
    permission_classes = [IsAuthenticated, IsEmailVerified, HasScanQuota]
    parser_classes = [MultiPartParser]

    @extend_schema(tags=["Scans"], summary="Submit screenshot scan")
    def post(self, request):
        serializer = SubmitScreenshotScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scan = ScanService.create_scan(
            request.user,
            ScanHistory.ScanType.SCREENSHOT,
            scan_input_file=serializer.validated_data["image"],
        )

        return Response(
            {
                "success": True,
                "scan_id": str(scan.id),
                "status": scan.status,
                "message": "Screenshot scan submitted.",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ScanDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/scans/<scan_id>/
    Retrieve a specific scan result with AI analysis and threat matches.
    """
    permission_classes = [IsAuthenticated, IsScanOwner]
    serializer_class = ScanHistorySerializer

    def get_queryset(self):
        return ScanHistory.objects.filter(user=self.request.user).prefetch_related(
            "threat_matches__threat"
        )

    @extend_schema(tags=["Scans"], summary="Get scan result")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ScanHistoryListView(generics.ListAPIView):
    """
    GET /api/v1/scans/history/
    List all scans for the current user with filtering.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ScanHistoryListSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["scan_type", "risk_level", "is_threat", "status"]
    ordering_fields = ["created_at", "risk_score"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ScanHistory.objects.filter(user=self.request.user)

    @extend_schema(tags=["Scans"], summary="List scan history")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ScanStatsView(APIView):
    """
    GET /api/v1/scans/stats/
    Returns scan statistics for the current user's dashboard.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Scans"], summary="Get scan statistics")
    def get(self, request):
        from django.db.models import Count, Avg
        from django.core.cache import cache

        cache_key = f"scan_stats_{request.user.id}"
        stats = cache.get(cache_key)

        if not stats:
            qs = ScanHistory.objects.filter(
                user=request.user,
                status=ScanHistory.ScanStatus.COMPLETED
            )
            agg = qs.aggregate(
                total=Count("id"),
                threats=Count("id", filter={"is_threat": True}),
                avg_risk=Avg("risk_score"),
            )
            by_type = list(qs.values("scan_type").annotate(count=Count("id")))
            by_risk = list(qs.values("risk_level").annotate(count=Count("id")))

            try:
                subscription = request.user.subscription
                remaining_scans = subscription.remaining_scans
                plan = subscription.plan
            except Exception:
                remaining_scans = 0
                plan = "free"

            stats = {
                "total_scans": agg["total"] or 0,
                "threats_detected": agg["threats"] or 0,
                "average_risk_score": round(float(agg["avg_risk"] or 0), 2),
                "scans_by_type": by_type,
                "scans_by_risk_level": by_risk,
                "remaining_scans": remaining_scans,
                "current_plan": plan,
            }
            cache.set(cache_key, stats, timeout=300)

        return Response(stats)
