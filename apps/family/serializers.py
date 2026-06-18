"""
CyberDaddy - Family Module Serializers
"""

from rest_framework import serializers
from .models import FamilyGroup, FamilyMember
from apps.users.serializers import UserProfileSerializer


class FamilyMemberSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = FamilyMember
        fields = [
            "id", "user", "role", "role_display",
            "is_active", "can_be_monitored",
            "alert_parent_on_threat", "joined_at",
        ]
        read_only_fields = ["id", "user", "joined_at"]


class FamilyGroupSerializer(serializers.ModelSerializer):
    members = FamilyMemberSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    admin = UserProfileSerializer(read_only=True)

    class Meta:
        model = FamilyGroup
        fields = [
            "id", "name", "description", "avatar",
            "admin", "invite_code", "is_invite_active",
            "member_count", "max_members", "status",
            "average_safety_score", "total_scans", "threats_detected",
            "members", "created_at",
        ]
        read_only_fields = [
            "id", "admin", "invite_code", "member_count",
            "average_safety_score", "total_scans", "threats_detected",
        ]


class FamilyGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyGroup
        fields = ["name", "description", "avatar"]


class JoinFamilySerializer(serializers.Serializer):
    invite_code = serializers.CharField(required=True, min_length=6, max_length=12)


class UpdateMemberRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = ["role", "can_be_monitored", "alert_parent_on_threat", "permissions"]


class MemberSafetyScoreSerializer(serializers.Serializer):
    member_id = serializers.UUIDField()
    name = serializers.CharField()
    role = serializers.CharField()
    safety_score = serializers.FloatField()


class FamilyDashboardSerializer(serializers.Serializer):
    """Aggregated family safety dashboard — matches GET /api/v1/family/dashboard/ response."""
    group = FamilyGroupSerializer()
    member_count = serializers.IntegerField()
    total_scans_this_month = serializers.IntegerField()
    threats_this_month = serializers.IntegerField()
    average_safety_score = serializers.FloatField()
    member_safety_scores = MemberSafetyScoreSerializer(many=True)
