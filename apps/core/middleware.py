"""
CyberDaddy - Custom Middleware
"""

import uuid
import logging
import zoneinfo
from django.utils import timezone

logger = logging.getLogger(__name__)


class RequestIDMiddleware:
    """
    Attaches a unique X-Request-ID to every request and response.
    This enables distributed tracing across services and log correlation.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Use incoming request ID or generate a new one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.request_id = request_id

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response


class TimezoneMiddleware:
    """
    Activates the user's preferred timezone for each request.
    Falls back to UTC if no timezone is set.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tzname = None

        if hasattr(request, "user") and request.user.is_authenticated:
            tzname = getattr(request.user, "timezone", None)

        if not tzname:
            tzname = request.headers.get("X-Timezone")

        if tzname:
            try:
                timezone.activate(zoneinfo.ZoneInfo(tzname))
            except (zoneinfo.ZoneInfoNotFoundError, KeyError):
                timezone.deactivate()
        else:
            timezone.deactivate()

        response = self.get_response(request)
        timezone.deactivate()
        return response
