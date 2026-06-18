"""
CyberDaddy - Shared Schema Serializers

These serializers exist solely for drf-spectacular schema generation.
They document common response shapes reused across the API.
They have no effect on runtime request/response handling.
"""

from rest_framework import serializers


class MessageSerializer(serializers.Serializer):
    """Standard success response: {"success": true, "message": "..."}"""
    success = serializers.BooleanField()
    message = serializers.CharField()


class ErrorDetailSerializer(serializers.Serializer):
    message = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    """Standard error response: {"success": false, "error": {"message": "..."}}"""
    success = serializers.BooleanField()
    error = ErrorDetailSerializer()


class HealthCheckServiceSerializer(serializers.Serializer):
    database = serializers.CharField()
    cache = serializers.CharField()


class HealthCheckSerializer(serializers.Serializer):
    """Response shape for GET /api/health/"""
    status = serializers.ChoiceField(choices=["healthy", "degraded"])
    services = HealthCheckServiceSerializer()
