"""
CyberDaddy - Users App Signals
Post-save signals for automatic side effects.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    After a new user is created:
    - Initialize their AI insights record
    - Create default subscription (Free plan)
    """
    if created:
        try:
            # Create free subscription on registration
            from apps.subscriptions.models import Subscription
            Subscription.objects.get_or_create(
                user=instance,
                defaults={"plan": Subscription.Plan.FREE}
            )
            logger.info(f"Free subscription created for new user: {instance.email}")
        except Exception as e:
            logger.error(f"Failed to create subscription for {instance.email}: {e}")

        try:
            # Create initial AI insights record
            from apps.ai_insights.models import AIInsight
            AIInsight.objects.get_or_create(
                user=instance,
                defaults={"safety_score": 100.00}
            )
        except Exception as e:
            logger.error(f"Failed to create AI insights for {instance.email}: {e}")
