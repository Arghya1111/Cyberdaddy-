"""
CyberDaddy - Users App Config
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Users"

    def ready(self):
        # Connect signals when app is ready
        import apps.users.signals  # noqa
