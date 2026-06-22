"""
CyberDaddy - Users Profile URLs
"""

from django.urls import path
from apps.users.views import (
    UserProfileView,
    ChangePasswordView,
    UserSessionListView,
    RevokeSessionView,
    VerifyEmailByTokenView,
)

app_name = "users"

urlpatterns = [
    path("me/", UserProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("sessions/", UserSessionListView.as_view(), name="sessions-list"),
    path("sessions/<uuid:session_id>/", RevokeSessionView.as_view(), name="session-revoke"),

    # Email verification via URL path token (used in verification email links)
    # GET /api/v1/users/verify-email/<token>/
    path("verify-email/<str:token>/", VerifyEmailByTokenView.as_view(), name="verify-email-token"),
]
