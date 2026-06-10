"""
CyberDaddy - Users App Models
============================================================
Tables:
- users            → Custom User model
- user_auth        → Auth tokens, OTPs, social login
- user_sessions    → Device session tracking

Design Decisions:
- UUID primary keys for security (prevents enumeration attacks)
- Email as the primary identifier (not username)
- Soft delete via SoftDeleteModel to preserve audit history
- UserAuth handles multi-provider login (email, Google, Apple)
- UserSession tracks device fingerprints for suspicious login detection
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.timezone import now as timezone_now
from apps.core.models import TimeStampedModel, SoftDeleteModel
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, SoftDeleteModel):
    """
    Custom User model for CyberDaddy.

    Uses email as the primary authentication identifier.
    UUID primary key prevents ID enumeration in API responses.
    """

    class AccountStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"
        PENDING_VERIFICATION = "pending_verification", "Pending Email Verification"

    class AccountType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        FAMILY_ADMIN = "family_admin", "Family Admin"
        FAMILY_MEMBER = "family_member", "Family Member"
        ENTERPRISE = "enterprise", "Enterprise"

    # Core Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    full_name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Account Status
    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING_VERIFICATION,
        db_index=True,
    )
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.INDIVIDUAL,
    )

    # Verification Flags
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    # Profile Metadata
    date_of_birth = models.DateField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    language = models.CharField(max_length=10, default="en")

    # Safety Profile
    safety_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text="AI-calculated safety score (0-100)"
    )

    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone_now)

    # Notification Preferences (stored as JSON for flexibility)
    notification_preferences = models.JSONField(
        default=dict,
        help_text="User notification channel preferences"
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["email", "account_status"]),
            models.Index(fields=["account_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_verified(self):
        return self.is_email_verified

    def get_default_notification_preferences(self):
        return {
            "email": True,
            "push": True,
            "sms": False,
            "family_alerts": True,
            "threat_alerts": True,
            "weekly_report": True,
        }


class UserAuth(TimeStampedModel):
    """
    Stores authentication credentials and tokens for multi-provider login.

    Supports:
    - Email/Password (hashed OTP for verification)
    - Google OAuth2
    - Apple Sign-In
    - Phone OTP (for India market)
    """

    class AuthProvider(models.TextChoices):
        EMAIL = "email", "Email & Password"
        GOOGLE = "google", "Google OAuth2"
        APPLE = "apple", "Apple Sign-In"
        PHONE = "phone", "Phone OTP"

    class TokenType(models.TextChoices):
        EMAIL_VERIFICATION = "email_verification", "Email Verification"
        PASSWORD_RESET = "password_reset", "Password Reset"
        PHONE_OTP = "phone_otp", "Phone OTP"
        INVITE = "invite", "Family Invite"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="auth_records"
    )

    # Auth Provider
    provider = models.CharField(max_length=20, choices=AuthProvider.choices)
    provider_uid = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="User ID from OAuth provider (e.g., Google sub)"
    )

    # Token Storage (for OTP / verification / reset flows)
    token = models.CharField(max_length=512, blank=True, null=True)
    token_type = models.CharField(
        max_length=30, choices=TokenType.choices, blank=True, null=True
    )
    token_expires_at = models.DateTimeField(null=True, blank=True)
    token_used_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    is_primary = models.BooleanField(
        default=False,
        help_text="Marks the primary authentication method for this user"
    )

    class Meta:
        db_table = "user_auth"
        verbose_name = "User Auth"
        verbose_name_plural = "User Auth Records"
        unique_together = [["user", "provider"]]
        indexes = [
            models.Index(fields=["token", "token_type"]),
            models.Index(fields=["provider", "provider_uid"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.provider}"

    @property
    def is_token_valid(self):
        if not self.token or not self.token_expires_at:
            return False
        return timezone.now() < self.token_expires_at and self.token_used_at is None


class UserSession(TimeStampedModel):
    """
    Tracks active device sessions for each user.

    Purpose:
    - Show users their active sessions (like Google account security page)
    - Detect and alert on suspicious logins (new device/location)
    - Allow users to remotely log out specific devices
    - Enforce session limits per subscription plan
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sessions"
    )

    # Device Fingerprint
    device_id = models.CharField(
        max_length=255, db_index=True,
        help_text="Client-generated device fingerprint"
    )
    device_name = models.CharField(
        max_length=100, blank=True,
        help_text="Human-readable device name (e.g., 'iPhone 15 Pro')"
    )
    device_type = models.CharField(
        max_length=20,
        choices=[
            ("mobile", "Mobile"), ("tablet", "Tablet"),
            ("desktop", "Desktop"), ("other", "Other"),
        ],
        default="other",
    )
    os_info = models.CharField(max_length=100, blank=True)
    browser_info = models.CharField(max_length=100, blank=True)

    # Network Info (for anomaly detection)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location_city = models.CharField(max_length=100, blank=True)
    location_country = models.CharField(max_length=50, blank=True)

    # Session State
    jwt_jti = models.CharField(
        max_length=255, unique=True, db_index=True,
        help_text="JWT JTI claim — links this session to a specific token"
    )
    is_active = models.BooleanField(default=True)
    last_active_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    logged_out_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_sessions"
        verbose_name = "User Session"
        verbose_name_plural = "User Sessions"
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["jwt_jti"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.device_name or self.device_id[:8]}"

    def logout(self):
        """Deactivate this session."""
        self.is_active = False
        self.logged_out_at = timezone.now()
        self.save(update_fields=["is_active", "logged_out_at"])
