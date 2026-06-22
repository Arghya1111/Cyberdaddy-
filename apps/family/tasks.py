"""
CyberDaddy - Family Celery Tasks
"""

import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.family.tasks.send_family_invite_email_task",
    max_retries=3,
    default_retry_delay=60,
    queue="notifications",
)
def send_family_invite_email_task(
    self,
    to_email: str,
    inviter_name: str,
    group_name: str,
    invite_code: str,
):
    """
    Send a family invite email to a given address.
    Called when the family admin shares the invite code via email.
    """
    try:
        from apps.notifications.services import EmailService

        expiry_hours = getattr(settings, "INVITE_CODE_EXPIRY_HOURS", 48)
        join_url = f"{settings.FRONTEND_URL}/family/join?code={invite_code}"
        signup_url = f"{settings.FRONTEND_URL}/register"

        EmailService.send_templated_email(
            to_email=to_email,
            subject=f"{inviter_name} invited you to join their CyberDaddy Family Circle",
            template="email/family_invite.html",
            context={
                "inviter_name": inviter_name,
                "group_name": group_name,
                "invite_code": invite_code,
                "join_url": join_url,
                "signup_url": signup_url,
                "expiry_hours": expiry_hours,
            },
        )
        logger.info(f"Family invite email sent to: {to_email} for group: {group_name}")

    except Exception as exc:
        logger.error(f"Failed to send family invite email to {to_email}: {exc}")
        raise self.retry(exc=exc)
