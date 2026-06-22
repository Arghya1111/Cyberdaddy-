"""
CyberDaddy - Users Service Layer
============================================================
Business logic is isolated in services, keeping views thin.
Services are the single source of truth for all user operations.
"""

import secrets
import hashlib
import logging
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings
from django.core.cache import cache

from .models import User, UserAuth, UserSession

logger = logging.getLogger(__name__)


class UserService:
    """Handles user creation and profile management."""

    @staticmethod
    def create_user(email: str, full_name: str, password: str, phone_number: str = None) -> User:
        """
        Creates a new user and sends email verification.
        Returns the created User instance.
        """
        user = User.objects.create_user(
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            password=password,
        )
        # Set default notification preferences
        user.notification_preferences = user.get_default_notification_preferences()
        user.save(update_fields=["notification_preferences"])

        # Create email auth record
        UserAuth.objects.create(user=user, provider=UserAuth.AuthProvider.EMAIL, is_primary=True)

        # Auto-verify email in local dev so scan endpoints work without real SMTP.
        from django.conf import settings as _settings
        if getattr(_settings, 'DEV_AUTO_VERIFY_EMAIL', False):
            user.is_email_verified = True
            user.is_active = True
            user.account_status = User.AccountStatus.ACTIVE
            user.save(update_fields=["is_email_verified", "is_active", "account_status"])
            logger.info(f"DEV_AUTO_VERIFY_EMAIL: auto-verified {user.email}")
        else:
            # Send verification email — synchronous on PythonAnywhere (console backend),
            # async via Celery worker in full production.
            from apps.users.tasks import send_email_verification_task
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    send_email_verification_task(str(user.id))
                except Exception as exc:
                    logger.warning(f"Verification email failed (non-critical for demo): {exc}")
            else:
                send_email_verification_task.delay(str(user.id))

        logger.info(f"New user created: {email}")
        return user

    @staticmethod
    def get_user_by_id(user_id: str) -> User:
        return User.objects.get(id=user_id)

    @staticmethod
    def update_user_profile(user: User, data: dict) -> User:
        for field, value in data.items():
            setattr(user, field, value)
        user.save()
        # Invalidate cached profile
        cache.delete(f"user_profile_{user.id}")
        return user

    @staticmethod
    def deactivate_user(user: User, reason: str = "") -> None:
        user.account_status = User.AccountStatus.SUSPENDED
        user.is_active = False
        user.save(update_fields=["account_status", "is_active"])
        # Invalidate all sessions
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
        logger.warning(f"User account deactivated: {user.email}. Reason: {reason}")


class AuthService:
    """Handles authentication flows: verification, reset, OTP, social."""

    TOKEN_HASH_ALGO = "sha256"

    @classmethod
    def _hash_token(cls, token: str) -> str:
        """Hash tokens before storing in DB — never store raw tokens."""
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def generate_and_store_token(
        cls,
        user: User,
        token_type: str,
        expiry_hours: int = None,
    ) -> str:
        """Generate a secure random token, hash it, and store in UserAuth."""
        raw_token = secrets.token_urlsafe(32)
        hashed = cls._hash_token(raw_token)

        expiry_hours = expiry_hours or settings.EMAIL_VERIFICATION_EXPIRY_HOURS
        expires_at = timezone.now() + timedelta(hours=expiry_hours)

        UserAuth.objects.update_or_create(
            user=user,
            token_type=token_type,
            defaults={
                "token": hashed,
                "token_expires_at": expires_at,
                "token_used_at": None,
                "provider": UserAuth.AuthProvider.EMAIL,
            }
        )
        return raw_token  # Return raw token to send to user

    @classmethod
    def verify_email(cls, raw_token: str) -> User:
        """Verify email using the raw token from the verification link."""
        hashed = cls._hash_token(raw_token)
        try:
            auth_record = UserAuth.objects.select_related("user").get(
                token=hashed,
                token_type=UserAuth.TokenType.EMAIL_VERIFICATION,
                token_used_at__isnull=True,
            )
        except UserAuth.DoesNotExist:
            raise ValueError("Invalid or expired verification token.")

        if not auth_record.is_token_valid:
            raise ValueError("Verification token has expired.")

        user = auth_record.user
        user.is_email_verified = True
        user.is_active = True
        user.account_status = User.AccountStatus.ACTIVE
        user.save(update_fields=["is_email_verified", "is_active", "account_status"])

        # Mark token as used (one-time use)
        auth_record.token_used_at = timezone.now()
        auth_record.save(update_fields=["token_used_at"])

        logger.info(f"Email verified for user: {user.email}")

        # Send welcome email now that the account is active
        from apps.users.tasks import send_welcome_email_task
        from django.conf import settings as _settings
        if not getattr(_settings, 'DEV_AUTO_VERIFY_EMAIL', False):
            if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                try:
                    send_welcome_email_task(str(user.id))
                except Exception as exc:
                    logger.warning(f"Welcome email failed (non-critical): {exc}")
            else:
                send_welcome_email_task.delay(str(user.id))

        return user

    @classmethod
    def initiate_password_reset(cls, email: str) -> None:
        """Generate and email a password reset token."""
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Do not reveal whether email exists — always respond the same
            logger.info(f"Password reset requested for non-existent email: {email}")
            return

        raw_token = cls.generate_and_store_token(
            user,
            UserAuth.TokenType.PASSWORD_RESET,
            expiry_hours=settings.PASSWORD_RESET_EXPIRY_HOURS,
        )

        from apps.users.tasks import send_password_reset_email_task
        from django.conf import settings as _settings
        if getattr(_settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                send_password_reset_email_task(str(user.id), raw_token)
            except Exception as exc:
                logger.warning(f"Password reset email failed (non-critical for demo): {exc}")
        else:
            send_password_reset_email_task.delay(str(user.id), raw_token)

    @classmethod
    def reset_password(cls, raw_token: str, new_password: str) -> User:
        """Validate reset token and set new password."""
        hashed = cls._hash_token(raw_token)
        try:
            auth_record = UserAuth.objects.select_related("user").get(
                token=hashed,
                token_type=UserAuth.TokenType.PASSWORD_RESET,
                token_used_at__isnull=True,
            )
        except UserAuth.DoesNotExist:
            raise ValueError("Invalid or expired reset token.")

        if not auth_record.is_token_valid:
            raise ValueError("Reset token has expired.")

        user = auth_record.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        auth_record.token_used_at = timezone.now()
        auth_record.save(update_fields=["token_used_at"])

        # Invalidate all sessions on password change (security best practice)
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

        logger.info(f"Password reset completed for: {user.email}")
        return user

    @classmethod
    def generate_otp(cls, phone_number: str, user: User) -> str:
        """Generate 6-digit OTP and store in cache (faster than DB for short-lived tokens)."""
        import random
        otp = str(random.randint(100000, 999999))
        cache_key = f"phone_otp_{phone_number}"
        cache.set(cache_key, otp, timeout=settings.OTP_EXPIRY_MINUTES * 60)
        return otp

    @classmethod
    def verify_otp(cls, phone_number: str, otp: str, user: User) -> bool:
        """Verify OTP from cache and mark phone as verified."""
        cache_key = f"phone_otp_{phone_number}"
        stored_otp = cache.get(cache_key)

        if not stored_otp or stored_otp != otp:
            return False

        cache.delete(cache_key)
        user.is_phone_verified = True
        user.phone_number = phone_number
        user.save(update_fields=["is_phone_verified", "phone_number"])
        return True


class SessionService:
    """Manages device sessions and JWT linkage."""

    @staticmethod
    def create_session(user: User, jwt_jti: str, device_info: dict, expires_at) -> UserSession:
        """Create a new device session linked to a JWT token."""
        session = UserSession.objects.create(
            user=user,
            jwt_jti=jwt_jti,
            expires_at=expires_at,
            **device_info,
        )
        return session

    @staticmethod
    def get_active_sessions(user: User):
        """Return all active sessions for a user."""
        return UserSession.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).order_by("-last_active_at")

    @staticmethod
    def logout_session(user: User, session_id: str) -> bool:
        """Logout a specific session by session UUID."""
        try:
            session = UserSession.objects.get(id=session_id, user=user, is_active=True)
            session.logout()
            return True
        except UserSession.DoesNotExist:
            return False

    @staticmethod
    def logout_session_by_jti(user: User, jti: str) -> bool:
        """Logout the session identified by a JWT JTI claim."""
        if not jti:
            return False
        try:
            session = UserSession.objects.get(jwt_jti=jti, user=user, is_active=True)
            session.logout()
            return True
        except UserSession.DoesNotExist:
            return False

    @staticmethod
    def logout_all_sessions(user: User, except_jti: str = None) -> int:
        """Logout all sessions, optionally keeping the current one."""
        qs = UserSession.objects.filter(user=user, is_active=True)
        if except_jti:
            qs = qs.exclude(jwt_jti=except_jti)
        count = qs.count()
        qs.update(is_active=False, logged_out_at=timezone.now())
        return count

    @staticmethod
    def cleanup_expired_sessions():
        """Remove sessions that have expired. Called by Celery Beat."""
        deleted_count, _ = UserSession.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        logger.info(f"Cleaned up {deleted_count} expired sessions")
        return deleted_count
