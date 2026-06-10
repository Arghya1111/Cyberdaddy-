"""
CyberDaddy - Family Module URLs
"""

from django.urls import path
from .views import (
    CreateFamilyGroupView, FamilyGroupDetailView,
    JoinFamilyGroupView, FamilyMembersListView,
    UpdateMemberRoleView, RemoveMemberView,
    RegenerateInviteCodeView, FamilyDashboardView,
)

app_name = "family"

urlpatterns = [
    path("create/", CreateFamilyGroupView.as_view(), name="create-group"),
    path("group/", FamilyGroupDetailView.as_view(), name="group-detail"),
    path("join/", JoinFamilyGroupView.as_view(), name="join-group"),
    path("members/", FamilyMembersListView.as_view(), name="members-list"),
    path("members/<uuid:pk>/", UpdateMemberRoleView.as_view(), name="update-member"),
    path("members/<uuid:pk>/remove/", RemoveMemberView.as_view(), name="remove-member"),
    path("invite/regenerate/", RegenerateInviteCodeView.as_view(), name="regenerate-invite"),
    path("dashboard/", FamilyDashboardView.as_view(), name="dashboard"),
]
