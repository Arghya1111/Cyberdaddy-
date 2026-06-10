"""
CyberDaddy - Users Admin Configuration
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserAuth, UserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "email", "full_name", "account_type", "account_status",
        "is_email_verified", "safety_score", "date_joined", "avatar_thumbnail",
    ]
    list_filter = [
        "account_status", "account_type", "is_email_verified",
        "is_phone_verified", "is_staff", "created_at",
    ]
    search_fields = ["email", "full_name", "phone_number"]
    ordering = ["-date_joined"]
    readonly_fields = ["id", "date_joined", "last_login", "safety_score"]

    fieldsets = (
        ("Identity", {"fields": ("id", "email", "full_name", "phone_number", "avatar")}),
        ("Account Status", {"fields": ("account_status", "account_type", "is_active")}),
        ("Verification", {"fields": ("is_email_verified", "is_phone_verified")}),
        ("Safety", {"fields": ("safety_score",)}),
        ("Preferences", {"fields": ("timezone", "language", "notification_preferences")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("date_joined", "last_login")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "password1", "password2"),
        }),
    )

    def avatar_thumbnail(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" width="30" height="30" />', obj.avatar.url)
        return "—"
    avatar_thumbnail.short_description = "Avatar"

    actions = ["activate_users", "suspend_users"]

    def activate_users(self, request, queryset):
        queryset.update(account_status=User.AccountStatus.ACTIVE, is_active=True)
        self.message_user(request, f"{queryset.count()} users activated.")
    activate_users.short_description = "Activate selected users"

    def suspend_users(self, request, queryset):
        queryset.update(account_status=User.AccountStatus.SUSPENDED)
        self.message_user(request, f"{queryset.count()} users suspended.")
    suspend_users.short_description = "Suspend selected users"


@admin.register(UserAuth)
class UserAuthAdmin(admin.ModelAdmin):
    list_display = ["user", "provider", "token_type", "is_primary", "token_expires_at", "created_at"]
    list_filter = ["provider", "token_type", "is_primary"]
    search_fields = ["user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = [
        "user", "device_name", "device_type", "ip_address",
        "location_country", "is_active", "last_active_at",
    ]
    list_filter = ["device_type", "is_active", "location_country"]
    search_fields = ["user__email", "device_name", "ip_address"]
    readonly_fields = ["id", "jwt_jti", "created_at", "updated_at"]
    ordering = ["-last_active_at"]
