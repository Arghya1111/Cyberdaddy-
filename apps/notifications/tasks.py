"""
CyberDaddy - Notifications Celery Tasks
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="apps.notifications.tasks.send_threat_alert_task",
    max_retries=3,
    default_retry_delay=10,
    queue="notifications",
)
def send_threat_alert_task(self, scan_id: str):
    """
    Send multi-channel threat alert after a high-risk scan.
    Channels: In-App + Push (always), Email/SMS if critical.
    Also alerts family parents if the user is a monitored child.
    """
    try:
        from apps.scam_detection.models import ScanHistory
        from apps.notifications.services import NotificationService
        from apps.notifications.models import Notification

        scan = ScanHistory.objects.select_related(
            "user", "family_member__family_group__admin"
        ).get(id=scan_id)
        user = scan.user

        title = f"⚠️ {scan.risk_level.title()} Risk Detected"
        body = scan.ai_summary or f"A {scan.risk_level} risk scan was detected in your {scan.scan_type}."
        data = {
            "scan_id": str(scan.id),
            "risk_level": scan.risk_level,
            "risk_score": str(scan.risk_score),
            "is_critical": scan.risk_level == "critical",
            "deep_link": f"cyberdaddy://scans/{scan.id}",
        }

        # In-App + Push notification to the scanned user
        NotificationService.send_notification(
            user=user,
            notification_type=Notification.NotificationType.THREAT_ALERT,
            title=title,
            body=body,
            channel=Notification.Channel.IN_APP,
            priority=Notification.Priority.HIGH if scan.risk_level in ["high", "critical"] else Notification.Priority.NORMAL,
            data=data,
            related_scan_id=scan.id,
        )

        NotificationService.send_notification(
            user=user,
            notification_type=Notification.NotificationType.THREAT_ALERT,
            title=title,
            body=body,
            channel=Notification.Channel.PUSH,
            priority=Notification.Priority.CRITICAL if scan.risk_level == "critical" else Notification.Priority.HIGH,
            data=data,
        )

        # --- Family Alert ---
        if scan.family_member and scan.family_member.alert_parent_on_threat:
            _send_family_alert(scan)

    except Exception as exc:
        logger.error(f"Failed to send threat alert for scan {scan_id}: {exc}")
        raise self.retry(exc=exc)


def _send_family_alert(scan):
    """Alert family admin/parents when a monitored member encounters a threat."""
    try:
        from apps.notifications.services import NotificationService
        from apps.notifications.models import Notification
        from apps.family.models import FamilyMember

        family_group = scan.family_member.family_group
        member_name = scan.user.full_name

        # Alert the family admin
        admin = family_group.admin
        NotificationService.send_notification(
            user=admin,
            notification_type=Notification.NotificationType.FAMILY_ALERT,
            title=f"Family Alert: {member_name} encountered a threat",
            body=f"{member_name} may have received a {scan.risk_level} risk message. Review now.",
            channel=Notification.Channel.PUSH,
            priority=Notification.Priority.HIGH,
            data={"scan_id": str(scan.id), "member_id": str(scan.family_member.id)},
        )

        # Also alert parent-role members
        parent_members = FamilyMember.objects.filter(
            family_group=family_group,
            role__in=[FamilyMember.MemberRole.PARENT, FamilyMember.MemberRole.GUARDIAN],
            is_active=True,
        ).exclude(user=admin).select_related("user")

        for parent_member in parent_members:
            NotificationService.send_notification(
                user=parent_member.user,
                notification_type=Notification.NotificationType.FAMILY_ALERT,
                title=f"Family Alert: {member_name}",
                body=f"{member_name} may have received a scam message.",
                channel=Notification.Channel.IN_APP,
                priority=Notification.Priority.HIGH,
            )
    except Exception as e:
        logger.error(f"Family alert failed: {e}")


@shared_task(
    bind=True,
    name="apps.notifications.tasks.send_sms_task",
    max_retries=3,
    default_retry_delay=30,
    queue="notifications",
)
def send_sms_task(self, phone_number: str, message: str):
    """Send an SMS message."""
    try:
        from apps.notifications.services import SMSService
        SMSService.send_sms(phone_number, message)
    except Exception as exc:
        raise self.retry(exc=exc)
