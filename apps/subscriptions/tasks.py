"""
CyberDaddy - Subscriptions Celery Tasks
"""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.subscriptions.tasks.check_subscription_expiry",
    queue="default",
)
def check_subscription_expiry():
    """
    Daily task to check for expired subscriptions and downgrade them.
    Runs at midnight UTC via Celery Beat.
    """
    from apps.subscriptions.models import Subscription

    now = timezone.now()

    # Find subscriptions that have expired
    expired = Subscription.objects.filter(
        status__in=[Subscription.SubscriptionStatus.ACTIVE, Subscription.SubscriptionStatus.TRIAL],
        current_period_end__lt=now,
    ).exclude(plan=Subscription.Plan.FREE)

    count = 0
    for sub in expired:
        sub.status = Subscription.SubscriptionStatus.EXPIRED
        sub.plan = Subscription.Plan.FREE
        sub.scans_limit = 10
        sub.save(update_fields=["status", "plan", "scans_limit"])
        count += 1

        # Notify user about expiry
        from apps.notifications.services import NotificationService
        from apps.notifications.models import Notification
        NotificationService.send_notification(
            user=sub.user,
            notification_type=Notification.NotificationType.SUBSCRIPTION,
            title="Subscription Expired",
            body="Your subscription has expired. Upgrade to continue enjoying premium features.",
            channel=Notification.Channel.IN_APP,
            priority=Notification.Priority.HIGH,
        )

    logger.info(f"Expired {count} subscriptions")
    return {"expired_count": count}
