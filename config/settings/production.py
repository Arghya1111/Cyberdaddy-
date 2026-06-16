"""
CyberDaddy - Production Settings
Inherits from base and applies production-grade hardening.
"""

import os

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

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
# Only activate S3 when credentials are present.  Without them
# collectstatic crashes at build time and gunicorn crashes at startup.
# ============================================================
if config("AWS_ACCESS_KEY_ID", default=""):
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    STATICFILES_STORAGE = "storages.backends.s3boto3.S3StaticStorage"
# else: keep base.py defaults (WhiteNoise + local filesystem)

# ============================================================
# Sentry - Error Monitoring & Performance Tracing
# ============================================================
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    _sentry_integrations = [
        DjangoIntegration(transaction_style="url"),
        CeleryIntegration(),
    ]
    # Add RedisIntegration only when Redis is actually in use; avoids
    # an import-time connection attempt when _USE_REDIS is False.
    if _USE_REDIS:  # noqa: F405 — defined in base.py
        from sentry_sdk.integrations.redis import RedisIntegration
        _sentry_integrations.append(RedisIntegration())

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=_sentry_integrations,
        traces_sample_rate=0.1,   # 10% of transactions for performance tracing
        profiles_sample_rate=0.1,
        send_default_pii=False,   # Never send PII to Sentry
        environment="production",
    )

# ============================================================
# Production Logging
# ============================================================
# Always log to console (stdout) — Render, Railway, Heroku, etc.
# all capture stdout for log aggregation.
# Add a rotating file handler only when the log directory exists
# (e.g. a self-hosted VM with /app/logs/ pre-created).
_LOG_DIR = "/app/logs"
_LOG_HANDLERS = ["console"]
_LOG_HANDLER_CONFIG: dict = {
    "console": {
        "class": "logging.StreamHandler",
        "formatter": "verbose",
    },
}

if os.path.isdir(_LOG_DIR):
    _LOG_HANDLERS.append("file")
    _LOG_HANDLER_CONFIG["file"] = {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": f"{_LOG_DIR}/django.log",
        "maxBytes": 10 * 1024 * 1024,  # 10 MB
        "backupCount": 5,
        "formatter": "verbose",
    }

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": _LOG_HANDLER_CONFIG,
    "root": {"handlers": _LOG_HANDLERS, "level": "WARNING"},
    "loggers": {
        "django": {"handlers": _LOG_HANDLERS, "level": "WARNING", "propagate": False},
        "django.security": {"handlers": _LOG_HANDLERS, "level": "ERROR", "propagate": False},
        "apps": {"handlers": _LOG_HANDLERS, "level": "INFO", "propagate": False},
        "celery": {"handlers": _LOG_HANDLERS, "level": "INFO", "propagate": False},
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
