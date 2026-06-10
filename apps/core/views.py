"""
CyberDaddy - Core Views (Health Check)
"""

from django.db import connection
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status


class HealthCheckView(APIView):
    """
    Health check endpoint for load balancers, K8s probes, and Docker HEALTHCHECK.
    Returns 200 OK if all critical services are reachable.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        health = {
            "status": "healthy",
            "services": {}
        }
        http_status = status.HTTP_200_OK

        # Check PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health["services"]["database"] = "ok"
        except Exception as e:
            health["services"]["database"] = f"error: {str(e)}"
            health["status"] = "degraded"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        # Check Redis
        try:
            cache.set("health_check", "ok", timeout=5)
            val = cache.get("health_check")
            health["services"]["cache"] = "ok" if val == "ok" else "error"
        except Exception as e:
            health["services"]["cache"] = f"error: {str(e)}"
            health["status"] = "degraded"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(health, status=http_status)
