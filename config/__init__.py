# config/__init__.py
# This file marks the config directory as a Python package.
# Celery app is imported here so it's loaded when Django starts
# (in full production with Celery installed).
# On PythonAnywhere / minimal deployments, Celery is not installed —
# the try/except ensures startup is not blocked.
try:
    from .celery_app import app as celery_app
    __all__ = ("celery_app",)
except ImportError:
    # Celery not installed — running in minimal/demo mode
    pass
