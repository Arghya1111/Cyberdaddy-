"""
CyberDaddy - Users App Serializers
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, UserSession


# ============================================================
# Custom JWT Token Serializer — adds user info to token claims
# ============================================================
class CyberDaddyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customized JWT serializer that embeds user claims into the token payload.
    This reduces DB lookups for basic user info in downstream services.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims to JWT payload
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["account_type"] = user.account_type
        token["account_status"] = user.account_status
        token["is_email_verified"] = user.is_email_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Reject login for non-active accounts
        if user.account_status == User.AccountStatus.SUSPENDED:
            raise serializers.ValidationError(
                "Your account has been suspended. Contact support@cyberdaddy.in"
            )

        # Add user info to response alongside tokens
        data["user"] = UserProfileSerializer(user).data
        return data


# ============================================================
# Registration Serializer
# ============================================================
class UserRegistrationSerializer(serializers.ModelSerializer):
    """Handles new user registration with password confirmation."""

    password = serializers.CharField(
        write_only=True, required=True,
        validators=[validate_password],
        style={"input_type": "password"}
    )
    confirm_password = serializers.CharField(
        write_only=True, required=True,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["email", "full_name", "phone_number", "password", "confirm_password"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        from .services import UserService
        return UserService.create_user(**validated_data)


# ============================================================
# User Profile Serializers
# ============================================================
class UserProfileSerializer(serializers.ModelSerializer):
    """Full user profile — used in auth responses and profile endpoints."""

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone_number", "avatar",
            "account_type", "account_status",
            "is_email_verified", "is_phone_verified",
            "safety_score", "timezone", "language",
            "notification_preferences", "date_joined", "last_login",
        ]
        read_only_fields = [
            "id", "email", "account_status", "safety_score", "date_joined", "last_login"
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update for user profile (name, timezone, preferences)."""

    class Meta:
        model = User
        fields = [
            "full_name", "phone_number", "avatar",
            "date_of_birth", "timezone", "language",
            "notification_preferences",
        ]


# ============================================================
# Auth Flow Serializers
# ============================================================
class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ConfirmPasswordResetSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"}
    )
    confirm_password = serializers.CharField(
        required=True,
        style={"input_type": "password"}
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class PhoneOTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)


class PhoneOTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)


class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=["google", "apple"])
    access_token = serializers.CharField(required=True)
    device_id = serializers.CharField(required=False, default="")


# ============================================================
# Session Serializers
# ============================================================
class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = [
            "id", "device_name", "device_type", "os_info", "browser_info",
            "ip_address", "location_city", "location_country",
            "is_active", "last_active_at", "created_at",
        ]
        read_only_fields = fields
