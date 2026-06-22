"""
CyberDaddy - Users App Views
============================================================
Thin views that delegate all business logic to services.
Views only handle: request parsing, calling service, returning response.
"""

import logging
from django.conf import settings
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers

from .models import User, UserSession
from .serializers import (
    CyberDaddyTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    EmailVerificationSerializer,
    ResendVerificationEmailSerializer,
    RequestPasswordResetSerializer,
    ConfirmPasswordResetSerializer,
    ChangePasswordSerializer,
    PhoneOTPRequestSerializer,
    PhoneOTPVerifySerializer,
    SocialLoginSerializer,
    UserSessionSerializer,
    LogoutSerializer,
)
from .services import UserService, AuthService, SessionService
from apps.core.exceptions import CyberDaddyAPIError
from apps.core.serializers import MessageSerializer, ErrorResponseSerializer

logger = logging.getLogger(__name__)


# ============================================================
# AUTH VIEWS
# ============================================================

class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Authenticate user with email/password and return JWT tokens.
    """
    serializer_class = CyberDaddyTokenObtainPairSerializer
    permission_classes = [AllowAny]

    @extend_schema(tags=["Auth"], summary="Login with email & password")
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Create a new user account. Sends verification email automatically.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Register new user account",
        responses={
            201: inline_serializer(
                name="RegisterResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "message": serializers.CharField(),
                    "user_id": serializers.UUIDField(),
                },
            )
        },
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "success": True,
                "message": "Account created. Please check your email to verify your account.",
                "user_id": str(user.id),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklist the refresh token and deactivate the current device session.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Logout current session",
        request=LogoutSerializer,
        responses={200: MessageSerializer},
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                jti = token.payload.get("jti")
                token.blacklist()
                SessionService.logout_session_by_jti(request.user, jti)

            return Response({"success": True, "message": "Logged out successfully."})
        except Exception as e:
            logger.warning(f"Logout error for {request.user.email}: {e}")
            return Response({"success": True, "message": "Logged out."})


class LogoutAllView(APIView):
    """
    POST /api/v1/auth/logout-all/
    Log out from all devices except the current one.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Logout all other devices",
        request=None,
        responses={200: MessageSerializer},
    )
    def post(self, request):
        current_jti = request.auth.payload.get("jti") if request.auth else None
        count = SessionService.logout_all_sessions(request.user, except_jti=current_jti)
        return Response({
            "success": True,
            "message": f"Logged out from {count} other device(s)."
        })


class VerifyEmailView(APIView):
    """
    POST /api/v1/users/auth/verify-email/
    Verify user email using the token submitted in the request body.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Verify user email address (body token)",
        request=EmailVerificationSerializer,
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            AuthService.verify_email(serializer.validated_data["token"])
            return Response({"success": True, "message": "Email verified successfully."})
        except ValueError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )


class VerifyEmailByTokenView(APIView):
    """
    GET /api/v1/users/verify-email/<token>/
    Verify user email via a URL path token (used in email links).
    One-time use, expiring token — sets is_email_verified=True and is_active=True.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Verify user email address (URL token)",
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def get(self, request, token):
        try:
            AuthService.verify_email(token)
            return Response({"success": True, "message": "Email verified successfully. You can now log in."})
        except ValueError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationEmailView(APIView):
    """
    POST /api/v1/users/auth/resend-verification/
    Resend email verification link. Accepts email in request body.
    No authentication required — unverified users cannot obtain a JWT token.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Resend email verification",
        request=ResendVerificationEmailSerializer,
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def post(self, request):
        serializer = ResendVerificationEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Always return 200 to prevent email enumeration
            return Response({"success": True, "message": "If this email is registered and unverified, a verification email has been sent."})

        if user.is_email_verified:
            return Response(
                {"success": False, "error": {"message": "This email address is already verified."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.users.tasks import send_email_verification_task
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                send_email_verification_task(str(user.id))
            except Exception as exc:
                logger.warning(f"Resend verification email failed (non-critical): {exc}")
        else:
            send_email_verification_task.delay(str(user.id))

        return Response({"success": True, "message": "Verification email sent. Please check your inbox."})


class RequestPasswordResetView(APIView):
    """
    POST /api/v1/auth/forgot-password/
    Request a password reset email.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Request password reset email",
        request=RequestPasswordResetSerializer,
        responses={200: MessageSerializer},
    )
    def post(self, request):
        serializer = RequestPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.initiate_password_reset(serializer.validated_data["email"])
        # Always return 200 to prevent email enumeration
        return Response({
            "success": True,
            "message": "If this email is registered, you will receive a reset link shortly."
        })


class ConfirmPasswordResetView(APIView):
    """
    POST /api/v1/auth/reset-password/
    Set a new password using the reset token.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Reset password with token",
        request=ConfirmPasswordResetSerializer,
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def post(self, request):
        serializer = ConfirmPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            AuthService.reset_password(
                serializer.validated_data["token"],
                serializer.validated_data["new_password"],
            )
            return Response({"success": True, "message": "Password reset successfully."})
        except ValueError as e:
            return Response(
                {"success": False, "error": {"message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )


class PhoneOTPRequestView(APIView):
    """
    POST /api/v1/auth/phone-otp/request/
    Send a 6-digit OTP to the given phone number.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Request phone OTP",
        request=PhoneOTPRequestSerializer,
        responses={200: MessageSerializer},
    )
    def post(self, request):
        serializer = PhoneOTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = AuthService.generate_otp(
            serializer.validated_data["phone_number"], request.user
        )
        from apps.notifications.tasks import send_sms_task
        sms_message = f"Your CyberDaddy OTP is: {otp}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes."
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                send_sms_task(serializer.validated_data["phone_number"], sms_message)
            except Exception as exc:
                logger.warning(f"OTP SMS failed (non-critical for demo): {exc}")
        else:
            send_sms_task.delay(serializer.validated_data["phone_number"], sms_message)
        return Response({"success": True, "message": "OTP sent to your phone."})


class PhoneOTPVerifyView(APIView):
    """
    POST /api/v1/auth/phone-otp/verify/
    Verify the OTP and mark phone as verified.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Verify phone OTP",
        request=PhoneOTPVerifySerializer,
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def post(self, request):
        serializer = PhoneOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        success = AuthService.verify_otp(
            serializer.validated_data["phone_number"],
            serializer.validated_data["otp"],
            request.user,
        )
        if success:
            return Response({"success": True, "message": "Phone number verified."})
        return Response(
            {"success": False, "error": {"message": "Invalid or expired OTP."}},
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================
# USER PROFILE VIEWS
# ============================================================

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/users/me/    → Get current user profile
    PUT  /api/v1/users/me/    → Update current user profile
    PATCH /api/v1/users/me/   → Partial update
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(tags=["Users"], summary="Get current user profile")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=["Users"], summary="Update user profile")
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(tags=["Users"], summary="Partial update user profile")
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """
    POST /api/v1/users/change-password/
    Change password for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Users"],
        summary="Change user password",
        request=ChangePasswordSerializer,
        responses={200: MessageSerializer, 400: ErrorResponseSerializer},
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"success": False, "error": {"message": "Current password is incorrect."}},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        SessionService.logout_all_sessions(user)
        return Response({"success": True, "message": "Password changed. Please log in again."})


class UserSessionListView(generics.ListAPIView):
    """
    GET /api/v1/users/sessions/
    List all active device sessions for the current user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return UserSession.objects.none()

        return SessionService.get_active_sessions(self.request.user)

    @extend_schema(tags=["Users"], summary="List active sessions")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class RevokeSessionView(APIView):
    """
    DELETE /api/v1/users/sessions/<session_id>/
    Revoke a specific device session.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Users"],
        summary="Revoke a device session",
        responses={200: MessageSerializer, 404: ErrorResponseSerializer},
    )
    def delete(self, request, session_id):
        success = SessionService.logout_session(request.user, session_id)
        if success:
            return Response({"success": True, "message": "Session revoked."})
        return Response(
            {"success": False, "error": {"message": "Session not found."}},
            status=status.HTTP_404_NOT_FOUND
        )
