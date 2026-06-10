"""
CyberDaddy - Celery Application Configuration
============================================================
Celery is used for:
- Async AI scan processing (heavy GPU/API tasks)
- Email / SMS / Push notification dispatch
- Daily threat intelligence updates
- Periodic AI insights generation
- Subscription lifecycle management
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module for Celery
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("cyberdaddy")

# Load configuration from Django settings using CELERY_ namespace
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# ============================================================
# Periodic Task Schedule (Celery Beat)
# ============================================================
app.conf.beat_schedule = {
    # Refresh threat intelligence from external sources every 6 hours
    "refresh-threat-intelligence": {
        "task": "apps.threat_intelligence.tasks.refresh_threat_database",
        "schedule": crontab(minute=0, hour="*/6"),
        "options": {"queue": "default"},
    },
    # Generate AI insights for active users daily at 2 AM IST
    "generate-daily-ai-insights": {
        "task": "apps.ai_insights.tasks.generate_daily_insights",
        "schedule": crontab(minute=30, hour=20),  # 20:30 UTC = 02:00 IST
        "options": {"queue": "ai"},
    },
    # Check and expire subscriptions daily at midnight
    "check-subscription-expiry": {
        "task": "apps.subscriptions.tasks.check_subscription_expiry",
        "schedule": crontab(minute=0, hour=0),
        "options": {"queue": "default"},
    },
    # Clean up expired user sessions every hour
    "cleanup-expired-sessions": {
        "task": "apps.users.tasks.cleanup_expired_sessions",
        "schedule": crontab(minute=0),
        "options": {"queue": "default"},
    },
    # Send weekly safety report to family admins
    "send-weekly-safety-report": {
        "task": "apps.ai_insights.tasks.send_weekly_safety_report",
        "schedule": crontab(minute=0, hour=9, day_of_week=1),  # Monday 9 AM UTC
        "options": {"queue": "notifications"},
    },
}

# ============================================================
# Celery Queue Routing
# Route tasks to specific queues for priority control
# ============================================================
app.conf.task_routes = {
    # AI-heavy tasks → dedicated AI queue
    "apps.scam_detection.tasks.*": {"queue": "ai"},
    "apps.ai_insights.tasks.*": {"queue": "ai"},
    # Notification tasks → dedicated notification queue
    "apps.notifications.tasks.*": {"queue": "notifications"},
    # All other tasks → default queue
    "*": {"queue": "default"},
}

app.conf.task_serializer = "json"
app.conf.result_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.timezone = "UTC"
app.conf.enable_utc = True

# Retry failed tasks with exponential backoff
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
