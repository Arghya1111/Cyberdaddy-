"""
CyberDaddy - Family Module URLs
"""

from django.urls import path
from .views import (
    CreateFamilyGroupView, FamilyGroupDetailView,
    JoinFamilyGroupView, FamilyMembersListView,
    UpdateMemberRoleView, RemoveMemberView,
    RegenerateInviteCodeView, SendFamilyInviteEmailView,
    FamilyDashboardView,
    LeaveFamilyGroupView, TransferOwnershipView, DeleteFamilyGroupView,
)

app_name = "family"

urlpatterns = [
    # Family lifecycle
    path("create/", CreateFamilyGroupView.as_view(), name="create-group"),
    path("group/", FamilyGroupDetailView.as_view(), name="group-detail"),
    path("delete/", DeleteFamilyGroupView.as_view(), name="delete-group"),

    # Membership
    path("join/", JoinFamilyGroupView.as_view(), name="join-group"),
    path("leave/", LeaveFamilyGroupView.as_view(), name="leave-group"),
    path("transfer-ownership/", TransferOwnershipView.as_view(), name="transfer-ownership"),

    # Member management
    path("members/", FamilyMembersListView.as_view(), name="members-list"),
    path("members/<uuid:pk>/", UpdateMemberRoleView.as_view(), name="update-member"),
    path("members/<uuid:pk>/remove/", RemoveMemberView.as_view(), name="remove-member"),

    # Invite
    path("invite/regenerate/", RegenerateInviteCodeView.as_view(), name="regenerate-invite"),
    path("invite/send/", SendFamilyInviteEmailView.as_view(), name="send-invite-email"),

    # Dashboard
    path("dashboard/", FamilyDashboardView.as_view(), name="dashboard"),
]
