"""
CyberDaddy - Threat Intelligence Views
"""

from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from .models import ThreatDatabase
from .serializers import ThreatDatabaseListSerializer, ThreatDatabaseDetailSerializer, ThreatSearchSerializer
from apps.core.pagination import LargeResultsSetPagination, StandardResultsSetPagination


class ThreatListView(generics.ListAPIView):
    """
    GET /api/v1/threats/
    List all active threats with filtering by category and severity.
    Results are cached for 1 hour.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ThreatDatabaseListSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "severity", "is_verified", "source"]
    search_fields = ["title", "description"]
    ordering_fields = ["severity", "reported_count", "created_at"]
    ordering = ["-severity", "-reported_count"]

    def get_queryset(self):
        return ThreatDatabase.objects.filter(is_active=True)

    @extend_schema(tags=["Threats"], summary="List threat intelligence database")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ThreatDetailView(generics.RetrieveAPIView):
    """GET /api/v1/threats/<id>/"""
    permission_classes = [IsAuthenticated]
    serializer_class = ThreatDatabaseDetailSerializer
    queryset = ThreatDatabase.objects.filter(is_active=True)

    @extend_schema(tags=["Threats"], summary="Get threat details")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ThreatSearchView(APIView):
    """
    POST /api/v1/threats/search/
    Search threats by text, URL, or phone number.
    Used by clients for quick threat lookups before submitting a full scan.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Threats"], summary="Search threat database")
    def post(self, request):
        serializer = ThreatSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data["query"]
        cache_key = f"threat_search_{hash(query)}"
        results = cache.get(cache_key)

        if not results:
            qs = ThreatDatabase.objects.filter(is_active=True)
            # Full-text search using pg_trgm trigram similarity
            from django.contrib.postgres.search import SearchVector, SearchQuery
            qs = qs.filter(
                title__icontains=query
            ) | qs.filter(
                description__icontains=query
            )

            if category := serializer.validated_data.get("category"):
                qs = qs.filter(category=category)
            if severity := serializer.validated_data.get("severity"):
                qs = qs.filter(severity__gte=severity)

            results = ThreatDatabaseListSerializer(qs[:20], many=True).data
            cache.set(cache_key, results, timeout=300)

        return Response({"results": results, "count": len(results)})


class ThreatStatsView(APIView):
    """GET /api/v1/threats/stats/ - Threat category statistics for dashboard."""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Threats"], summary="Threat statistics")
    def get(self, request):
        from django.db.models import Count
        cache_key = "threat_stats"
        stats = cache.get(cache_key)

        if not stats:
            stats = {
                "total_active_threats": ThreatDatabase.objects.filter(is_active=True).count(),
                "by_category": list(
                    ThreatDatabase.objects.filter(is_active=True)
                    .values("category")
                    .annotate(count=Count("id"))
                    .order_by("-count")
                ),
                "by_severity": list(
                    ThreatDatabase.objects.filter(is_active=True)
                    .values("severity")
                    .annotate(count=Count("id"))
                ),
                "most_reported": list(
                    ThreatDatabase.objects.filter(is_active=True)
                    .order_by("-reported_count")[:5]
                    .values("id", "title", "category", "reported_count")
                ),
            }
            cache.set(cache_key, stats, timeout=3600)

        return Response(stats)
