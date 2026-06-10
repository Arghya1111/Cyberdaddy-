"""
CyberDaddy - Users Auth URLs
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from apps.users.views import (
    LoginView, RegisterView, LogoutView, LogoutAllView,
    VerifyEmailView, ResendVerificationEmailView,
    RequestPasswordResetView, ConfirmPasswordResetView,
    PhoneOTPRequestView, PhoneOTPVerifyView,
)

app_name = "auth"

urlpatterns = [
    # Core Auth
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("logout-all/", LogoutAllView.as_view(), name="logout-all"),

    # JWT Token Management
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),

    # Email Verification
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend-verification"),

    # Password Reset
    path("forgot-password/", RequestPasswordResetView.as_view(), name="forgot-password"),
    path("reset-password/", ConfirmPasswordResetView.as_view(), name="reset-password"),

    # Phone OTP
    path("phone-otp/request/", PhoneOTPRequestView.as_view(), name="phone-otp-request"),
    path("phone-otp/verify/", PhoneOTPVerifyView.as_view(), name="phone-otp-verify"),
]
