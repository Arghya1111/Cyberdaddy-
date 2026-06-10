"""
CyberDaddy - Custom Exception Handler
Normalizes all DRF error responses to a consistent format.
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that wraps DRF errors in a consistent envelope:
    {
        "success": false,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Human-readable description",
            "details": { ... }  # Optional field-level errors
        }
    }
    """
    # Call DRF's default handler first to get the standard response
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "success": False,
            "error": {
                "code": _get_error_code(response.status_code),
                "message": _get_error_message(response.data),
                "details": response.data if isinstance(response.data, dict) else None,
            }
        }
        response.data = error_data
    else:
        # Unhandled exception — log it and return 500
        logger.exception("Unhandled exception in view", exc_info=exc)
        response = Response(
            {
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_code(status_code: int) -> str:
    code_map = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
    }
    return code_map.get(status_code, "API_ERROR")


def _get_error_message(data) -> str:
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        # Return first field error message
        for key, value in data.items():
            if isinstance(value, list) and value:
                return f"{key}: {value[0]}"
            if isinstance(value, str):
                return value
    if isinstance(data, list) and data:
        return str(data[0])
    return "An error occurred."


class CyberDaddyAPIError(Exception):
    """Base exception class for CyberDaddy domain errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "API_ERROR"
    default_message = "A request error occurred."

    def __init__(self, message=None, code=None, status_code=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        if status_code:
            self.status_code = status_code
        super().__init__(self.message)


class ScanLimitExceededError(CyberDaddyAPIError):
    default_code = "SCAN_LIMIT_EXCEEDED"
    default_message = "You have reached your scan limit. Please upgrade your plan."
    status_code = status.HTTP_402_PAYMENT_REQUIRED


class SubscriptionRequiredError(CyberDaddyAPIError):
    default_code = "SUBSCRIPTION_REQUIRED"
    default_message = "This feature requires an active subscription."
    status_code = status.HTTP_402_PAYMENT_REQUIRED


class FamilyLimitExceededError(CyberDaddyAPIError):
    default_code = "FAMILY_LIMIT_EXCEEDED"
    default_message = "Maximum family member limit reached."
    status_code = status.HTTP_400_BAD_REQUEST
