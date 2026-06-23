"""
CyberDaddy - Custom User Manager
"""

from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Custom manager for the User model.
    Overrides create_user and create_superuser to use email as the
    primary identifier instead of username.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)

        # TODO: Re-enable email verification in production
        # When REQUIRE_EMAIL_VERIFICATION=False, start users as immediately
        # active so they can log in without clicking a verification link.
        from django.conf import settings
        skip_verification = not getattr(settings, 'REQUIRE_EMAIL_VERIFICATION', True)
        extra_fields.setdefault("is_active", True if skip_verification else False)
        extra_fields.setdefault("is_email_verified", True if skip_verification else False)
        extra_fields.setdefault(
            "account_status",
            "active" if skip_verification else "pending_verification",
        )
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", True)
        extra_fields.setdefault("account_status", "active")
        extra_fields.setdefault("full_name", "Super Admin")
        return self.create_user(email, password, **extra_fields)

    def get_active_users(self):
        return self.filter(account_status="active", is_active=True)

    def get_by_email(self, email):
        return self.get(email=self.normalize_email(email))
