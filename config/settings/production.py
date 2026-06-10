"""
CyberDaddy - Production Settings
Inherits from base and applies production-grade hardening.
"""

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

from .base import *  # noqa

# ============================================================
# Security Hardening
# ============================================================
DEBUG = False
SECRET_KEY = config("SECRET_KEY")  # noqa - Must be set in env
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())  # noqa

# HTTPS Settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# ============================================================
# AWS S3 Media Storage
# ============================================================
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
STATICFILES_STORAGE = "storages.backends.s3boto3.S3StaticStorage"

# ============================================================
# Sentry - Error Monitoring & Performance Tracing
# ============================================================
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,   # 10% of transactions for performance tracing
        profiles_sample_rate=0.1,
        send_default_pii=False,   # Never send PII to Sentry
        environment="production",
    )

# ============================================================
# Production Logging - JSON format for log aggregation
# ============================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        },
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/app/logs/django.log",
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 5,
            "formatter": "verbose",
        },
        "mail_admins": {
            "level": "ERROR",
            "class": "django.utils.log.AdminEmailHandler",
            "filters": ["require_debug_false"],
        },
    },
    "root": {"handlers": ["console", "file"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
        "django.security": {"handlers": ["console", "file"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "celery": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
    },
}

# ============================================================
# Cache Timeouts for Production
# ============================================================
CACHE_TIMEOUTS = {
    "threat_db": 3600,          # 1 hour
    "user_profile": 300,        # 5 minutes
    "family_group": 600,        # 10 minutes
    "subscription_status": 120, # 2 minutes
    "ai_insights": 1800,        # 30 minutes
    "scan_history_list": 60,    # 1 minute
}
