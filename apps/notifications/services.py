"""
CyberDaddy - Notifications Service Layer
Multi-channel notification dispatch: Push, Email, SMS
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Sends transactional emails via SendGrid."""

    @staticmethod
    def send_templated_email(to_email: str, subject: str, template: str, context: dict):
        """Send a templated HTML email. The .txt version is optional."""
        try:
            from django.template.loader import render_to_string
            from django.core.mail import EmailMultiAlternatives

            html_content = render_to_string(template, context)

            # .txt template is optional — fall back to empty plain text body
            try:
                text_content = render_to_string(template.replace(".html", ".txt"), context)
            except Exception:
                text_content = ""

            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            logger.info(f"Email sent to {to_email}: {subject}")
        except Exception as e:
            logger.exception("Email send failed to %s: %s", to_email, e)
            raise


class PushNotificationService:
    """Sends push notifications via Firebase Cloud Messaging."""

    _firebase_app = None

    @classmethod
    def _get_firebase_app(cls):
        if not cls._firebase_app and settings.FIREBASE_CREDENTIALS_PATH:
            import firebase_admin
            from firebase_admin import credentials
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            cls._firebase_app = firebase_admin.initialize_app(cred)
        return cls._firebase_app

    @classmethod
    def send_push(cls, device_token: str, title: str, body: str, data: dict = None):
        """Send a push notification to a specific device."""
        try:
            from firebase_admin import messaging
            cls._get_firebase_app()

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={str(k): str(v) for k, v in (data or {}).items()},
                token=device_token,
                android=messaging.AndroidConfig(
                    priority="high" if data and data.get("is_critical") else "normal"
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default")
                    )
                ),
            )
            messaging.send(message)
            logger.info(f"Push notification sent to device: {device_token[:20]}...")
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            raise

    @classmethod
    def send_push_to_user(cls, user, title: str, body: str, data: dict = None):
        """Send push notification to all active devices of a user."""
        # Device tokens stored in user sessions or a separate DeviceToken model
        # For now, fetch from user sessions that have device tokens
        from apps.users.models import UserSession
        active_sessions = UserSession.objects.filter(
            user=user, is_active=True
        ).exclude(device_id="")

        for session in active_sessions:
            # In production, store FCM tokens separately; using device_id as placeholder
            try:
                cls.send_push(session.device_id, title, body, data)
            except Exception:
                pass


class SMSService:
    """Sends SMS via Twilio."""

    @staticmethod
    def send_sms(phone_number: str, message: str):
        """Send an SMS message."""
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number,
            )
            logger.info(f"SMS sent to: {phone_number}")
        except Exception as e:
            logger.error(f"SMS send failed to {phone_number}: {e}")
            raise


class NotificationService:
    """
    Orchestrates notification dispatch across all channels.
    Creates a DB record and dispatches to the appropriate channel.
    """

    @staticmethod
    def send_notification(
        user,
        notification_type: str,
        title: str,
        body: str,
        channel: str = "in_app",
        priority: str = "normal",
        data: dict = None,
        related_scan_id=None,
        related_threat_id=None,
    ):
        """Create notification record and dispatch via requested channel."""
        from apps.notifications.models import Notification
        from django.utils import timezone

        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            body=body,
            channel=channel,
            priority=priority,
            data=data or {},
            related_scan_id=related_scan_id,
            related_threat_id=related_threat_id,
        )

        try:
            if channel == Notification.Channel.PUSH:
                PushNotificationService.send_push_to_user(user, title, body, data)
            elif channel == Notification.Channel.EMAIL:
                # Email sent via dedicated tasks for templating
                pass
            elif channel == Notification.Channel.SMS:
                if user.phone_number:
                    SMSService.send_sms(user.phone_number, body)

            notification.status = Notification.Status.SENT
            notification.sent_at = timezone.now()
        except Exception as e:
            notification.status = Notification.Status.FAILED
            notification.failed_reason = str(e)

        notification.save(update_fields=["status", "sent_at", "failed_reason"])
        return notification
