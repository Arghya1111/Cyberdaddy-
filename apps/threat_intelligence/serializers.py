"""
CyberDaddy - Threat Intelligence Serializers
"""

from rest_framework import serializers
from .models import ThreatDatabase


class ThreatDatabaseListSerializer(serializers.ModelSerializer):
    """Lightweight threat listing for public API."""

    class Meta:
        model = ThreatDatabase
        fields = [
            "id", "title", "category", "severity",
            "is_verified", "reported_count", "first_seen",
        ]


class ThreatDatabaseDetailSerializer(serializers.ModelSerializer):
    """Full threat detail for admin or detailed lookups."""
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = ThreatDatabase
        fields = [
            "id", "title", "description",
            "category", "category_display",
            "severity", "severity_display",
            "keywords", "malicious_urls", "malicious_phone_numbers",
            "source", "credibility_score", "is_verified",
            "reported_count", "first_seen", "last_seen",
            "ai_metadata", "created_at",
        ]


class ThreatSearchSerializer(serializers.Serializer):
    """Input for threat search API."""
    query = serializers.CharField(required=True, min_length=2, max_length=500)
    category = serializers.ChoiceField(
        choices=ThreatDatabase.ScamCategory.choices, required=False
    )
    severity = serializers.IntegerField(min_value=1, max_value=4, required=False)
