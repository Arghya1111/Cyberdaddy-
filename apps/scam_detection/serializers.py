"""
CyberDaddy - Scam Detection Serializers
"""

from rest_framework import serializers
from .models import ScanHistory, ThreatScanMatch
from apps.threat_intelligence.serializers import ThreatDatabaseListSerializer


class ThreatScanMatchSerializer(serializers.ModelSerializer):
    threat = ThreatDatabaseListSerializer(read_only=True)

    class Meta:
        model = ThreatScanMatch
        fields = ["id", "threat", "confidence_score", "match_method", "matched_text"]


class ScanHistorySerializer(serializers.ModelSerializer):
    """Full scan result with AI response and threat matches."""
    threat_matches = ThreatScanMatchSerializer(many=True, read_only=True)
    scan_type_display = serializers.CharField(source="get_scan_type_display", read_only=True)
    risk_level_display = serializers.CharField(source="get_risk_level_display", read_only=True)

    class Meta:
        model = ScanHistory
        fields = [
            "id", "scan_type", "scan_type_display",
            "scan_input_text", "scan_input_url",
            "status", "risk_score", "risk_level", "risk_level_display",
            "is_threat", "scam_category",
            "ai_summary", "ai_response",
            "processing_time_ms",
            "threat_matches",
            "created_at",
        ]
        read_only_fields = [
            "id", "status", "risk_score", "risk_level", "is_threat",
            "scam_category", "ai_summary", "ai_response", "processing_time_ms",
            "threat_matches", "created_at",
        ]


class ScanHistoryListSerializer(serializers.ModelSerializer):
    """Lightweight scan list (no full AI response for performance)."""

    class Meta:
        model = ScanHistory
        fields = [
            "id", "scan_type", "status", "risk_score",
            "risk_level", "is_threat", "scam_category",
            "ai_summary", "created_at",
        ]


class SubmitTextScanSerializer(serializers.Serializer):
    """Serializer for SMS, URL, Email, Phone scan requests."""
    scan_type = serializers.ChoiceField(
        choices=["sms", "url", "email", "phone_number"]
    )
    content = serializers.CharField(required=True, max_length=10000)

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Scan content cannot be empty.")
        return value


class SubmitScreenshotScanSerializer(serializers.Serializer):
    """Serializer for screenshot scan with file upload."""
    image = serializers.ImageField(required=True)

    def validate_image(self, value):
        from django.conf import settings
        max_size = settings.SCAN_FILE_MAX_SIZE_MB * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image size must not exceed {settings.SCAN_FILE_MAX_SIZE_MB}MB."
            )
        return value
