"""
CyberDaddy - PythonAnywhere MVP Settings
============================================================
Lean settings for PythonAnywhere deployment.
- SQLite database (no PostgreSQL driver needed on free tier)
- In-memory cache (no Redis)
- WhiteNoise static files (no S3)
- Local media storage
- Celery disabled — all tasks run synchronously
- Email: console backend (prints to logs)
- Groq API supported as OpenAI drop-in

Usage:
    DJANGO_SETTINGS_MODULE=config.settings.pythonanywhere
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ============================================================
# Inherit safe base values then override everything
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ============================================================
# Core
# ============================================================
SECRET_KEY = config("SECRET_KEY", default="CHANGE-ME-IN-PRODUCTION-pythonanywhere-secret-key-123!")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="yourusername.pythonanywhere.com,localhost,127.0.0.1",
    cast=Csv(),
)

# ============================================================
# Application Definition
# ============================================================
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # NOTE: django.contrib.postgres is NOT included — we use SQLite here
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # NOTE: storages, celery, django_celery_beat, django_celery_results,
    #       django_redis, django_prometheus are all EXCLUDED for MVP
]

LOCAL_APPS = [
    "apps.users",
    "apps.family",
    "apps.scam_detection",
    "apps.threat_intelligence",
    "apps.subscriptions",
    # "apps.payments",  # temporarily disabled — stripe/razorpay not configured
    "apps.notifications",
    "apps.ai_insights",
    "apps.core",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ============================================================
# Custom User Model
# ============================================================
AUTH_USER_MODEL = "users.User"

# ============================================================
# Middleware
# ============================================================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
    "apps.core.middleware.TimezoneMiddleware",
]

# ============================================================
# URL Configuration
# ============================================================
ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ============================================================
# Database — SQLite for PythonAnywhere MVP
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        "OPTIONS": {
            "timeout": 20,  # seconds — helps with concurrent writes
        },
    }
}

# ============================================================
# Cache — In-Memory (no Redis)
# ============================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cyberdaddy-cache",
    }
}

# Use DB-backed sessions (not Redis)
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_AGE = 86400  # 24 hours

# ============================================================
# Password Validation
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ============================================================
# Internationalization
# ============================================================
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ============================================================
# Static & Media Files — WhiteNoise (no S3)
# ============================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = []  # Populated only if BASE_DIR/static exists
if (BASE_DIR / "static").exists():
    STATICFILES_DIRS = [BASE_DIR / "static"]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Keep WhiteNoise serving media too (simple approach for MVP)
WHITENOISE_ROOT = BASE_DIR / "staticfiles"

# ============================================================
# Default Primary Key
# ============================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================
# Django REST Framework
# ============================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/hour",
        "scan": "50/hour",
        "auth": "10/minute",
    },
}

# ============================================================
# JWT Configuration
# ============================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("SECRET_KEY", default="CHANGE-ME-IN-PRODUCTION-pythonanywhere-secret-key-123!"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "JTI_CLAIM": "jti",
}

# ============================================================
# DRF Spectacular (Swagger / OpenAPI)
# ============================================================
SPECTACULAR_SETTINGS = {
    "TITLE": "CyberDaddy API",
    "DESCRIPTION": "AI-powered Family Cybersecurity SaaS Platform",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "CONTACT": {"email": "dev@cyberdaddy.in"},
    "LICENSE": {"name": "Proprietary"},
    "ENUM_NAME_OVERRIDES": {
        "ScanStatusEnum": [
            "pending", "processing", "completed", "failed",
        ],
        "RiskLevelEnum": [
            "safe", "low", "medium", "high", "critical",
        ],
        "ScanTypeEnum": [
            "screenshot", "sms", "url", "email", "phone_number",
        ],
        "SubscriptionStatusEnum": [
            "active", "trial", "past_due", "cancelled", "expired", "paused",
        ],
        "NotificationStatusEnum": [
            "pending", "sent", "delivered", "failed", "read",
        ],
        "NotificationPriorityEnum": [
            "low", "normal", "high", "critical",
        ],
        "NotificationTypeEnum": [
            "threat_alert", "scan_complete", "family_alert", "weekly_report",
            "subscription", "payment", "system", "welcome",
        ],
        "FamilyGroupStatusEnum": ["active", "suspended"],
        "MemberRoleEnum": [
            "parent", "guardian", "child", "elderly", "member",
        ],
        "UserAccountStatusEnum": [
            "active", "inactive", "suspended", "pending_verification",
        ],
        "UserAccountTypeEnum": [
            "individual", "family_admin", "family_member", "enterprise",
        ],
        "ScanTypeInputEnum": [
            "sms", "url", "email", "phone_number",
        ],
        "ScanHistoryTypeEnum": [
            "screenshot", "sms", "url", "email", "phone_number",
        ],
    },
    "COMPONENT_SPLIT_REQUEST": False,
}

# ============================================================
# CORS — allow Vercel frontend
# ============================================================
def _clean_origin(url: str) -> str:
    return url.strip().rstrip("/")


FRONTEND_URL = _clean_origin(config("FRONTEND_URL", default="https://your-app.vercel.app"))
_cors_from_env = [
    _clean_origin(o)
    for o in config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())
    if o.strip()
]
CORS_ALLOWED_ORIGINS = sorted(
    {
        _clean_origin("http://localhost:3000"),
        _clean_origin("http://127.0.0.1:3000"),
        FRONTEND_URL,
    }
    | set(_cors_from_env)
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-request-id",
]

# ============================================================
# Celery — DISABLED for PythonAnywhere MVP
# All tasks run synchronously via direct function calls.
# ============================================================
CELERY_TASK_ALWAYS_EAGER = True          # Makes .delay() / .apply_async() run synchronously
CELERY_TASK_EAGER_PROPAGATES = False     # Email/SMS failures must not abort HTTP responses
CELERY_BROKER_URL = "memory://"          # In-memory broker (no Redis needed)
CELERY_RESULT_BACKEND = "cache"
CELERY_CACHE_BACKEND = "memory"

# ============================================================
# Email — Console backend for MVP (no SendGrid needed)
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@cyberdaddy.in")

# ============================================================
# AI — Groq (primary) / OpenAI (fallback)
# Using Groq's OpenAI-compatible API for cheaper inference
# ============================================================
GROQ_API_KEY = config("GROQ_API_KEY", default="")
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OPENAI_MODEL = config("OPENAI_MODEL", default="llama-3.3-70b-versatile")  # Groq model
OPENAI_MAX_TOKENS = 2048
OPENAI_TEMPERATURE = 0.2

# ============================================================
# Security — relaxed for PythonAnywhere (they handle TLS)
# ============================================================
SECURE_SSL_REDIRECT = False  # PA handles TLS termination — do NOT redirect
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=False, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=False, cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
_csrf_from_env = [
    _clean_origin(o)
    for o in config(
        "CSRF_TRUSTED_ORIGINS",
        default="https://yourusername.pythonanywhere.com",
        cast=Csv(),
    )
    if o.strip()
]
CSRF_TRUSTED_ORIGINS = sorted({FRONTEND_URL} | set(_csrf_from_env))

# ============================================================
# AWS S3 — disabled for MVP (use local media)
# ============================================================
AWS_ACCESS_KEY_ID = ""
AWS_SECRET_ACCESS_KEY = ""
AWS_STORAGE_BUCKET_NAME = ""

# ============================================================
# Payment Gateways — configured but not active for demo
# ============================================================
STRIPE_PUBLIC_KEY = config("STRIPE_PUBLIC_KEY", default="")
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
RAZORPAY_KEY_ID = config("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = config("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = config("RAZORPAY_WEBHOOK_SECRET", default="")

# ============================================================
# Twilio SMS — disabled for MVP
# ============================================================
TWILIO_ACCOUNT_SID = ""
TWILIO_AUTH_TOKEN = ""
TWILIO_PHONE_NUMBER = ""

# ============================================================
# Firebase — disabled for MVP
# ============================================================
FIREBASE_CREDENTIALS_PATH = ""

# ============================================================
# Application-Specific Settings
# ============================================================
# FRONTEND_URL is defined above with _clean_origin (CORS section).
INVITE_CODE_EXPIRY_HOURS = config("INVITE_CODE_EXPIRY_HOURS", default=48, cast=int)
MAX_FAMILY_MEMBERS = config("MAX_FAMILY_MEMBERS", default=10, cast=int)
SCAN_FILE_MAX_SIZE_MB = 10
EMAIL_VERIFICATION_EXPIRY_HOURS = 24
PASSWORD_RESET_EXPIRY_HOURS = 2
OTP_EXPIRY_MINUTES = 10

# ============================================================
# Logging — file-based for PythonAnywhere
# ============================================================
PA_LOG_DIR = Path.home() / "logs"
PA_LOG_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(PA_LOG_DIR / "cyberdaddy.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10MB
            "backupCount": 3,
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console", "file"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
        "django.security": {"handlers": ["console", "file"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
    },
}
