"""
CyberDaddy - Threat Intelligence Celery Tasks
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.threat_intelligence.tasks.refresh_threat_database",
    queue="default",
)
def refresh_threat_database():
    """
    Periodic task that fetches fresh threat data from external feeds.
    Runs every 6 hours via Celery Beat.
    
    In production, integrate with:
    - PhishTank API for phishing URLs
    - CERT-In threat feeds
    - RBI advisory APIs  
    - Custom threat intelligence partners
    """
    from apps.threat_intelligence.models import ThreatDatabase
    from django.core.cache import cache
    from django.utils import timezone

    logger.info("Starting threat database refresh...")

    # Clear cached threat patterns so the next scan uses fresh data
    cache.delete("active_threat_patterns")
    cache.delete("threat_stats")

    # In production, fetch from external APIs here:
    # threats = fetch_from_phishtank()
    # threats += fetch_from_cert_in()
    # for threat_data in threats:
    #     ThreatDatabase.objects.update_or_create(...)

    logger.info("Threat database refresh completed")
    return {"status": "completed", "timestamp": str(timezone.now())}


@shared_task(
    name="apps.threat_intelligence.tasks.process_user_threat_report",
    queue="default",
)
def process_user_threat_report(threat_data: dict, reported_by_user_id: str):
    """
    Process a user-submitted threat report.
    Creates a new ThreatDatabase entry with 'user_reported' source.
    Admin review required before activation.
    """
    from apps.threat_intelligence.models import ThreatDatabase

    ThreatDatabase.objects.create(
        title=threat_data.get("title", "User Reported Threat"),
        description=threat_data.get("description", ""),
        category=threat_data.get("category", ThreatDatabase.ScamCategory.OTHER),
        severity=ThreatDatabase.SeverityLevel.MEDIUM,
        keywords=threat_data.get("keywords", []),
        malicious_urls=threat_data.get("urls", []),
        source=ThreatDatabase.ThreatSource.USER_REPORTED,
        is_active=False,  # Requires admin verification
        is_verified=False,
        ai_metadata={"reported_by": str(reported_by_user_id)},
    )
    logger.info(f"User threat report processed from user: {reported_by_user_id}")
