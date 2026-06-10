"""
CyberDaddy - Users Celery Tasks
"""

import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.users.tasks.send_email_verification_task",
    max_retries=3,
    default_retry_delay=60,
    queue="notifications",
)
def send_email_verification_task(self, user_id: str):
    """
    Send email verification link to the user.
    Retries up to 3 times with 60-second delay on failure.
    """
    try:
        from apps.users.models import User, UserAuth
        from apps.users.services import AuthService
        from apps.notifications.services import EmailService

        user = User.objects.get(id=user_id)
        raw_token = AuthService.generate_and_store_token(
            user,
            UserAuth.TokenType.EMAIL_VERIFICATION,
            expiry_hours=settings.EMAIL_VERIFICATION_EXPIRY_HOURS,
        )
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"

        EmailService.send_templated_email(
            to_email=user.email,
            subject="Verify your CyberDaddy account",
            template="email/verify_email.html",
            context={
                "user_name": user.full_name,
                "verification_url": verification_url,
                "expiry_hours": settings.EMAIL_VERIFICATION_EXPIRY_HOURS,
            },
        )
        logger.info(f"Verification email sent to: {user.email}")

    except Exception as exc:
        logger.error(f"Failed to send verification email for user {user_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="apps.users.tasks.send_password_reset_email_task",
    max_retries=3,
    default_retry_delay=30,
    queue="notifications",
)
def send_password_reset_email_task(self, user_id: str, raw_token: str):
    """Send password reset email."""
    try:
        from apps.users.models import User
        from apps.notifications.services import EmailService

        user = User.objects.get(id=user_id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

        EmailService.send_templated_email(
            to_email=user.email,
            subject="Reset your CyberDaddy password",
            template="email/password_reset.html",
            context={
                "user_name": user.full_name,
                "reset_url": reset_url,
                "expiry_hours": settings.PASSWORD_RESET_EXPIRY_HOURS,
            },
        )
        logger.info(f"Password reset email sent to: {user.email}")

    except Exception as exc:
        logger.error(f"Failed to send password reset email for {user_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(
    name="apps.users.tasks.cleanup_expired_sessions",
    queue="default",
)
def cleanup_expired_sessions():
    """Periodic task to remove expired sessions. Runs every hour via Celery Beat."""
    from apps.users.services import SessionService
    count = SessionService.cleanup_expired_sessions()
    return {"deleted_sessions": count}
