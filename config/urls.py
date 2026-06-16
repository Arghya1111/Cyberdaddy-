"""
CyberDaddy - Root URL Configuration
============================================================
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# ============================================================
# API v1 URL patterns
# ============================================================
api_v1_patterns = [
    # Core health check
    path("health/", include("apps.core.urls", namespace="core")),

    # User management & authentication
    path("users/", include("apps.users.urls", namespace="users")),

    # Family circle
    path("family/", include("apps.family.urls", namespace="family")),

    # Scam detection / AI scanning
    path("scans/", include("apps.scam_detection.urls", namespace="scans")),

    # Threat intelligence
    path("threats/", include("apps.threat_intelligence.urls", namespace="threats")),

    # Subscriptions
    path("subscriptions/", include("apps.subscriptions.urls", namespace="subscriptions")),

    # Payments
    path("payments/", include("apps.payments.urls", namespace="payments")),

    # Notifications
    path("notifications/", include("apps.notifications.urls", namespace="notifications")),

    # AI Insights
    path("insights/", include("apps.ai_insights.urls", namespace="insights")),
]

# ============================================================
# Root URL patterns
# ============================================================
urlpatterns = [
    # Root → redirect to API docs
    path("", RedirectView.as_view(url="/api/docs/", permanent=False)),

    # Admin site
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/", include(api_v1_patterns)),

    # OpenAPI schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Prometheus metrics (only if django_prometheus is installed)
try:
    urlpatterns += [path("", include("django_prometheus.urls"))]
except Exception:
    pass
