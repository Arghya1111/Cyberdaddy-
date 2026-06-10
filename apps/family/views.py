"""
CyberDaddy - Family Module Views
"""

import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .models import FamilyGroup, FamilyMember
from .serializers import (
    FamilyGroupSerializer, FamilyGroupCreateSerializer,
    FamilyMemberSerializer, JoinFamilySerializer,
    UpdateMemberRoleSerializer,
)
from apps.core.permissions import IsFamilyAdmin, HasFamilyPlan, IsEmailVerified
from apps.core.exceptions import FamilyLimitExceededError

logger = logging.getLogger(__name__)


class CreateFamilyGroupView(generics.CreateAPIView):
    """
    POST /api/v1/family/create/
    Create a new family group. User becomes the admin.
    Requires Family Plan subscription.
    """
    permission_classes = [IsAuthenticated, IsEmailVerified, HasFamilyPlan]
    serializer_class = FamilyGroupCreateSerializer

    @extend_schema(tags=["Family"], summary="Create family group")
    def create(self, request, *args, **kwargs):
        # Check if user already has a group
        if hasattr(request.user, "managed_family_group"):
            return Response(
                {"success": False, "error": {"message": "You already manage a family group."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = FamilyGroup.objects.create(
            admin=request.user,
            invite_code=FamilyGroup.generate_invite_code(),
            **serializer.validated_data,
        )

        # Automatically add admin as a parent member
        FamilyMember.objects.create(
            family_group=group,
            user=request.user,
            role=FamilyMember.MemberRole.PARENT,
            join_method=FamilyMember.JoinMethod.DIRECT_ADD,
        )

        return Response(
            FamilyGroupSerializer(group).data,
            status=status.HTTP_201_CREATED
        )


class FamilyGroupDetailView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/family/group/    → Get family group details
    PATCH /api/v1/family/group/   → Update group name/description (admin only)
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]
    serializer_class = FamilyGroupSerializer

    def get_object(self):
        return self.request.user.managed_family_group

    @extend_schema(tags=["Family"], summary="Get/Update family group")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class JoinFamilyGroupView(APIView):
    """
    POST /api/v1/family/join/
    Join a family group using an invite code.
    """
    permission_classes = [IsAuthenticated, IsEmailVerified]

    @extend_schema(tags=["Family"], summary="Join family with invite code")
    def post(self, request):
        serializer = JoinFamilySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check user isn't already in a family
        if hasattr(request.user, "family_membership"):
            return Response(
                {"success": False, "error": {"message": "You are already in a family group."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            group = FamilyGroup.objects.get(
                invite_code__iexact=serializer.validated_data["invite_code"],
                status=FamilyGroup.GroupStatus.ACTIVE,
            )
        except FamilyGroup.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Invalid invite code."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not group.is_invite_valid:
            return Response(
                {"success": False, "error": {"message": "This invite code has expired."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        if group.is_full():
            return Response(
                {"success": False, "error": {"message": "Family group is full."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        member = FamilyMember.objects.create(
            family_group=group,
            user=request.user,
            role=FamilyMember.MemberRole.MEMBER,
            join_method=FamilyMember.JoinMethod.INVITE_CODE,
        )

        return Response({
            "success": True,
            "message": f"Successfully joined {group.name}!",
            "member": FamilyMemberSerializer(member).data,
        }, status=status.HTTP_201_CREATED)


class FamilyMembersListView(generics.ListAPIView):
    """
    GET /api/v1/family/members/
    List all members of the user's family group.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        if hasattr(self.request.user, "managed_family_group"):
            group = self.request.user.managed_family_group
        elif hasattr(self.request.user, "family_membership"):
            group = self.request.user.family_membership.family_group
        else:
            return FamilyMember.objects.none()

        return FamilyMember.objects.filter(
            family_group=group, is_active=True
        ).select_related("user")

    @extend_schema(tags=["Family"], summary="List family members")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UpdateMemberRoleView(generics.UpdateAPIView):
    """
    PATCH /api/v1/family/members/<member_id>/
    Update a family member's role or monitoring settings (admin only).
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]
    serializer_class = UpdateMemberRoleSerializer

    def get_queryset(self):
        return FamilyMember.objects.filter(
            family_group=self.request.user.managed_family_group
        )

    @extend_schema(tags=["Family"], summary="Update member role")
    def patch(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)


class RemoveMemberView(APIView):
    """
    DELETE /api/v1/family/members/<member_id>/remove/
    Remove a member from the family group (admin only).
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]

    @extend_schema(tags=["Family"], summary="Remove family member")
    def delete(self, request, pk):
        try:
            member = FamilyMember.objects.get(
                id=pk,
                family_group=request.user.managed_family_group,
                is_active=True,
            )
            if member.user == request.user:
                return Response(
                    {"success": False, "error": {"message": "Admin cannot remove themselves."}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            member.is_active = False
            member.save(update_fields=["is_active"])
            return Response({"success": True, "message": "Member removed from family."})
        except FamilyMember.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Member not found."}},
                status=status.HTTP_404_NOT_FOUND
            )


class RegenerateInviteCodeView(APIView):
    """
    POST /api/v1/family/invite/regenerate/
    Generate a new invite code (invalidates the old one).
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]

    @extend_schema(tags=["Family"], summary="Regenerate invite code")
    def post(self, request):
        group = request.user.managed_family_group
        group.refresh_invite_code()
        return Response({
            "success": True,
            "invite_code": group.invite_code,
            "expires_at": group.invite_code_expires_at,
        })


class FamilyDashboardView(APIView):
    """
    GET /api/v1/family/dashboard/
    Aggregated family safety dashboard with member stats.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Family"], summary="Family safety dashboard")
    def get(self, request):
        from django.core.cache import cache
        from apps.scam_detection.models import ScanHistory
        from django.utils import timezone
        from datetime import timedelta

        user = request.user
        if hasattr(user, "managed_family_group"):
            group = user.managed_family_group
        elif hasattr(user, "family_membership"):
            group = user.family_membership.family_group
        else:
            return Response(
                {"success": False, "error": {"message": "You are not in a family group."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        cache_key = f"family_dashboard_{group.id}"
        dashboard = cache.get(cache_key)

        if not dashboard:
            members = group.members.filter(is_active=True).select_related("user")
            member_ids = members.values_list("user_id", flat=True)

            this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0)
            recent_scans = ScanHistory.objects.filter(
                user__in=member_ids,
                created_at__gte=this_month_start,
                status=ScanHistory.ScanStatus.COMPLETED,
            )

            dashboard = {
                "group": FamilyGroupSerializer(group).data,
                "member_count": members.count(),
                "total_scans_this_month": recent_scans.count(),
                "threats_this_month": recent_scans.filter(is_threat=True).count(),
                "average_safety_score": float(group.average_safety_score),
                "member_safety_scores": [
                    {
                        "member_id": str(m.id),
                        "name": m.user.full_name,
                        "role": m.role,
                        "safety_score": float(m.user.safety_score),
                    }
                    for m in members
                ],
            }
            cache.set(cache_key, dashboard, timeout=600)

        return Response(dashboard)
