"""
CyberDaddy - Family Module Views
"""

import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .models import FamilyGroup, FamilyMember
from .serializers import (
    FamilyGroupSerializer, FamilyGroupCreateSerializer,
    FamilyMemberSerializer, JoinFamilySerializer,
    UpdateMemberRoleSerializer, FamilyDashboardSerializer,
)
from apps.core.permissions import IsFamilyAdmin, IsEmailVerified
from apps.core.exceptions import FamilyLimitExceededError
from apps.core.serializers import MessageSerializer, ErrorResponseSerializer

logger = logging.getLogger(__name__)


class CreateFamilyGroupView(generics.CreateAPIView):
    """
    POST /api/v1/family/create/
    Create a new family group. User becomes the admin.
    Available to all authenticated users.
    """
    permission_classes = [IsAuthenticated, IsEmailVerified]
    serializer_class = FamilyGroupCreateSerializer

    @extend_schema(
        tags=["Family"],
        summary="Create family group",
        request=FamilyGroupCreateSerializer,
        responses={201: FamilyGroupSerializer, 400: ErrorResponseSerializer},
    )
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

    @extend_schema(
        tags=["Family"],
        summary="Get/Update family group",
        responses={200: FamilyGroupSerializer},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class JoinFamilyGroupView(APIView):
    """
    POST /api/v1/family/join/
    Join a family group using an invite code.
    """
    permission_classes = [IsAuthenticated, IsEmailVerified]

    @extend_schema(
        tags=["Family"],
        summary="Join family with invite code",
        request=JoinFamilySerializer,
        responses={
            201: inline_serializer(
                name="JoinFamilyResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                    "member": FamilyMemberSerializer(),
                },
            ),
            400: ErrorResponseSerializer,
        },
    )
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

        # Notify the family admin that a new member joined
        try:
            from apps.notifications.services import NotificationService
            NotificationService.send_notification(
                user=group.admin,
                notification_type="family_alert",
                title="New Family Member",
                body=f"{request.user.full_name} has joined your family circle.",
                channel="in_app",
                priority="normal",
                data={"event": "member_joined", "member_id": str(member.id)},
            )
        except Exception as exc:
            logger.warning(f"Family join notification failed: {exc}")

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
        if getattr(self, "swagger_fake_view", False):
            return FamilyMember.objects.none()

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
        if getattr(self, "swagger_fake_view", False):
            return FamilyMember.objects.none()

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

    @extend_schema(
        tags=["Family"],
        summary="Remove family member",
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
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
            removed_user = member.user
            member.is_active = False
            member.save(update_fields=["is_active"])
            # Notify the removed member
            try:
                from apps.notifications.services import NotificationService
                NotificationService.send_notification(
                    user=removed_user,
                    notification_type="family_alert",
                    title="Removed from Family Circle",
                    body=f"You have been removed from {request.user.managed_family_group.name}.",
                    channel="in_app",
                    priority="normal",
                    data={"event": "member_removed"},
                )
            except Exception as exc:
                logger.warning(f"Member removal notification failed: {exc}")
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

    @extend_schema(
        tags=["Family"],
        summary="Regenerate invite code",
        request=None,
        responses={
            200: inline_serializer(
                name="RegenerateInviteCodeResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "invite_code": serializers.CharField(),
                    "expires_at": serializers.DateTimeField(),
                },
            )
        },
    )
    def post(self, request):
        group = request.user.managed_family_group
        group.refresh_invite_code()
        return Response({
            "success": True,
            "invite_code": group.invite_code,
            "expires_at": group.invite_code_expires_at,
        })


class SendFamilyInviteEmailView(APIView):
    """
    POST /api/v1/family/invite/send/
    Send the current family invite code to a given email address.
    Requires the caller to be the family group admin.
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]

    @extend_schema(
        tags=["Family"],
        summary="Send family invite via email",
        request=inline_serializer(
            name="SendFamilyInviteEmailRequest",
            fields={"email": serializers.EmailField()},
        ),
        responses={
            200: inline_serializer(
                name="SendFamilyInviteEmailResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                },
            ),
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        to_email = request.data.get("email", "").strip().lower()
        if not to_email:
            return Response(
                {"success": False, "error": {"message": "An email address is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = request.user.managed_family_group

        from apps.family.tasks import send_family_invite_email_task
        from django.conf import settings as _settings
        kwargs = dict(
            to_email=to_email,
            inviter_name=request.user.full_name,
            group_name=group.name,
            invite_code=group.invite_code,
        )
        if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                send_family_invite_email_task(**kwargs)
            except Exception as exc:
                logger.warning(f"Family invite email failed (non-critical): {exc}")
        else:
            send_family_invite_email_task.delay(**kwargs)

        return Response({
            "success": True,
            "message": f"Invite email sent to {to_email}.",
        })


class FamilyDashboardView(APIView):
    """
    GET /api/v1/family/dashboard/
    Aggregated family safety dashboard with member stats.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Family"],
        summary="Family safety dashboard",
        responses={200: FamilyDashboardSerializer, 400: ErrorResponseSerializer},
    )
    def get(self, request):
        from django.core.cache import cache
        from apps.scam_detection.models import ScanHistory
        from django.utils import timezone
        from datetime import timedelta

        try:
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

        except Exception as e:
            logger.error(
                f"Family Dashboard Error | user={request.user.id} | error={str(e)}"
            )
            raise


class LeaveFamilyGroupView(APIView):
    """
    POST /api/v1/family/leave/
    Current user leaves their family group.
    The admin cannot leave — they must transfer ownership first.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Family"],
        summary="Leave family group",
        request=None,
        responses={
            200: inline_serializer(
                name="LeaveFamilyResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                },
            ),
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        if not hasattr(request.user, "family_membership"):
            return Response(
                {"success": False, "error": {"message": "You are not in a family group."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership = request.user.family_membership
        group = membership.family_group

        if group.admin == request.user:
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": (
                            "You are the family admin. Transfer ownership to another member "
                            "before leaving, or delete the family group."
                        )
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.is_active = False
        membership.save(update_fields=["is_active"])

        # Notify family admin
        try:
            from apps.notifications.services import NotificationService
            NotificationService.send_notification(
                user=group.admin,
                notification_type="family_alert",
                title="Member Left Family Circle",
                body=f"{request.user.full_name} has left {group.name}.",
                channel="in_app",
                priority="normal",
                data={"event": "member_left"},
            )
        except Exception as exc:
            logger.warning(f"Leave family notification failed: {exc}")

        return Response({"success": True, "message": f"You have left {group.name}."})


class TransferOwnershipView(APIView):
    """
    POST /api/v1/family/transfer-ownership/
    Transfer family admin role to another active member.
    Only the current admin can call this.
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]

    @extend_schema(
        tags=["Family"],
        summary="Transfer family ownership",
        request=inline_serializer(
            name="TransferOwnershipRequest",
            fields={"member_id": serializers.UUIDField()},
        ),
        responses={
            200: inline_serializer(
                name="TransferOwnershipResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                },
            ),
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        member_id = request.data.get("member_id")
        if not member_id:
            return Response(
                {"success": False, "error": {"message": "member_id is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = request.user.managed_family_group
        try:
            new_admin_membership = FamilyMember.objects.get(
                id=member_id, family_group=group, is_active=True
            )
        except FamilyMember.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Member not found in this family."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if new_admin_membership.user == request.user:
            return Response(
                {"success": False, "error": {"message": "You are already the admin."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_admin = new_admin_membership.user

        # Promote new admin's membership role
        new_admin_membership.role = FamilyMember.MemberRole.PARENT
        new_admin_membership.save(update_fields=["role"])

        # Hand over admin field on FamilyGroup
        group.admin = new_admin
        group.save(update_fields=["admin"])

        # Notify new admin
        try:
            from apps.notifications.services import NotificationService
            NotificationService.send_notification(
                user=new_admin,
                notification_type="family_alert",
                title="You're now the Family Admin",
                body=f"{request.user.full_name} has transferred ownership of {group.name} to you.",
                channel="in_app",
                priority="high",
                data={"event": "ownership_transferred"},
            )
        except Exception as exc:
            logger.warning(f"Transfer ownership notification failed: {exc}")

        logger.info(
            f"Family ownership transferred | group={group.id} "
            f"from={request.user.email} to={new_admin.email}"
        )
        return Response({
            "success": True,
            "message": f"Ownership of {group.name} transferred to {new_admin.full_name}.",
        })


class DeleteFamilyGroupView(APIView):
    """
    DELETE /api/v1/family/delete/
    Permanently delete the family group and remove all members.
    Only the family admin can do this.
    """
    permission_classes = [IsAuthenticated, IsFamilyAdmin]

    @extend_schema(
        tags=["Family"],
        summary="Delete family group",
        request=None,
        responses={
            200: inline_serializer(
                name="DeleteFamilyGroupResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                },
            ),
        },
    )
    def delete(self, request):
        group = request.user.managed_family_group
        group_name = group.name

        # Notify all active members before deletion
        try:
            from apps.notifications.services import NotificationService
            members = group.members.filter(is_active=True).exclude(user=request.user)
            for m in members:
                NotificationService.send_notification(
                    user=m.user,
                    notification_type="family_alert",
                    title="Family Circle Dissolved",
                    body=f'The family circle "{group_name}" has been deleted by the admin.',
                    channel="in_app",
                    priority="high",
                    data={"event": "family_deleted"},
                )
        except Exception as exc:
            logger.warning(f"Family deletion notifications failed: {exc}")

        group.delete()
        logger.info(f"Family group deleted | name={group_name} | admin={request.user.email}")
        return Response({"success": True, "message": f'Family circle "{group_name}" has been deleted.'})
