"""
CyberDaddy - Local Development Settings
Inherits from base settings and overrides for development.
"""

from .base import *  # noqa

# ============================================================
# Development-specific overrides
# ============================================================
# Remove django.contrib.postgres — it requires psycopg2/psycopg
# which is not needed when using SQLite for local development.
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.postgres"]  # noqa
DEBUG = True
SECRET_KEY = config("SECRET_KEY", default="dev-secret-key-change-in-production-!!!!")  # noqa
ALLOWED_HOSTS = ["*"]

# ============================================================
# ngrok tunnel support
# ============================================================
# Allow ngrok tunnel hosts so Django does not reject requests via ngrok.
# ALLOWED_HOSTS = ["*"] already covers this, but also add the ngrok
# hostname explicitly so CSRF middleware and secure cookies work.
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)

# ============================================================
# Dev convenience: auto-verify email on registration
# so scan endpoints (IsEmailVerified) work without real SMTP
# ============================================================
DEV_AUTO_VERIFY_EMAIL = True

# ============================================================
# Database - Use SQLite for ultra-fast local testing
# Or keep PostgreSQL (recommended for parity with production)
# ============================================================
# Using SQLite for local development (no PostgreSQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ============================================================
# Cache - Use local memory cache (no Redis needed for local dev)
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Use database-backed sessions instead of Redis
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# ============================================================
# Email - Use console backend in development
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ============================================================
# DRF - Allow browsable API in development
# ============================================================
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]

# ============================================================
# Disable throttling during development
# ============================================================
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa

# ============================================================
# CORS - Allow all in development
# ============================================================
CORS_ALLOW_ALL_ORIGINS = True

# ============================================================
# Django Debug Toolbar (optional, install if needed)
# ============================================================
# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")
# INTERNAL_IPS = ["127.0.0.1"]

# ============================================================
# AWS S3 - Use local filesystem in development
# ============================================================
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# ============================================================
# Payment stub values for local development
# (real values only needed when testing payment flows)
# ============================================================
STRIPE_PRICE_PREMIUM_MONTHLY = config("STRIPE_PRICE_PREMIUM_MONTHLY", default="price_local_premium_monthly")  # noqa
STRIPE_PRICE_PREMIUM_YEARLY = config("STRIPE_PRICE_PREMIUM_YEARLY", default="price_local_premium_yearly")    # noqa
STRIPE_PRICE_FAMILY_MONTHLY = config("STRIPE_PRICE_FAMILY_MONTHLY", default="price_local_family_monthly")    # noqa
STRIPE_PRICE_FAMILY_YEARLY = config("STRIPE_PRICE_FAMILY_YEARLY", default="price_local_family_yearly")       # noqa

# Celery — run tasks synchronously in dev so no worker is needed
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ============================================================
# Logging - Verbose in development
# ============================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {"format": "{levelname} {message}", "style": "{"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        # Set to DEBUG only when actively debugging SQL — very noisy otherwise
        "django.db.backends": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
