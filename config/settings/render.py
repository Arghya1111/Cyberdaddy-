"""
CyberDaddy - Render.com Settings
=================================
Inherits from production.py and overrides everything that requires
Redis, S3, or a writable local filesystem — none of which are
guaranteed on Render's free/starter tier without explicit add-ons.

HOW TO RE-ENABLE REDIS (when you add a Render Redis service):
  1. Set the CACHE_URL env var in the Render dashboard to the
     Redis internal connection string (e.g. redis://...).
  2. Change DJANGO_SETTINGS_MODULE back to
     config.settings.production in render.yaml.
  3. Remove or comment-out this file's CACHES / SESSION_ENGINE /
     REST_FRAMEWORK throttle overrides.
"""

import os

from .production import *  # noqa: F401,F403
from decouple import config, Csv  # noqa: F401

# ============================================================
# Cache — LocMemCache (no Redis required)
# DRF throttling, health-checks, and all cache.get/set calls
# in apps/* work with LocMemCache — data is just per-process
# and not shared across dynos.
#
# To re-enable Redis: remove this CACHES block.
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cyberdaddy-render",
    }
}

# Sessions: database-backed so no Redis session store needed.
# To re-enable Redis sessions: remove these two lines.
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_CACHE_ALIAS = "default"  # unused with db engine, kept for clarity

# ============================================================
# DRF Throttling — disabled (throttling uses the cache backend;
# LocMemCache works but throttle state is per-process only).
# Re-enable by removing the next line.
# ============================================================
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

# ============================================================
# Celery — eager / synchronous execution
# Without a live Redis broker the Celery worker cannot connect.
# Tasks are executed inline in the web process instead.
# Re-enable async Celery: remove the next two lines and
# provision a Render Redis service.
# ============================================================
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ============================================================
# Static & media files — WhiteNoise / local filesystem
# production.py overrides both to S3, which requires valid AWS
# credentials and a bucket.  On Render we serve statics via
# WhiteNoise (already in MIDDLEWARE via base.py) and store
# uploaded media on the ephemeral local disk.
#
# To re-enable S3: remove this block.
# ============================================================
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# ============================================================
# Logging — stdout only (Render captures stdout/stderr)
# production.py adds a RotatingFileHandler to /app/logs/django.log
# which does not exist on Render and causes a crash at startup.
# ============================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
