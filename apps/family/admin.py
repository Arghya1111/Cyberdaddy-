"""
CyberDaddy - Family Admin
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import FamilyGroup, FamilyMember


class FamilyMemberInline(admin.TabularInline):
    model = FamilyMember
    extra = 0
    readonly_fields = ["user", "role", "joined_at", "join_method"]
    fields = ["user", "role", "is_active", "can_be_monitored", "join_method", "joined_at"]


@admin.register(FamilyGroup)
class FamilyGroupAdmin(admin.ModelAdmin):
    list_display = [
        "name", "admin", "member_count", "status",
        "average_safety_score", "invite_code", "invite_status_badge", "created_at",
    ]
    list_filter = ["status", "is_invite_active"]
    search_fields = ["name", "admin__email", "invite_code"]
    readonly_fields = [
        "id", "invite_code", "member_count", "average_safety_score",
        "total_scans", "threats_detected", "created_at", "updated_at",
    ]
    inlines = [FamilyMemberInline]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Identity", {"fields": ("id", "name", "description", "avatar", "admin")}),
        ("Invite System", {
            "fields": ("invite_code", "invite_code_expires_at", "is_invite_active", "max_members"),
        }),
        ("Status", {"fields": ("status",)}),
        ("Aggregated Stats", {
            "fields": ("member_count", "average_safety_score", "total_scans", "threats_detected"),
        }),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    actions = ["refresh_invite_codes", "activate_groups", "suspend_groups"]

    def member_count(self, obj):
        return obj.member_count
    member_count.short_description = "Members"

    def invite_status_badge(self, obj):
        if obj.is_invite_valid:
            return format_html('<span style="color: green; font-weight: bold;">Active</span>')
        return format_html('<span style="color: gray;">Expired/Inactive</span>')
    invite_status_badge.short_description = "Invite"

    def refresh_invite_codes(self, request, queryset):
        for group in queryset:
            group.refresh_invite_code()
        self.message_user(request, f"Refreshed invite codes for {queryset.count()} groups.")
    refresh_invite_codes.short_description = "Refresh invite codes"

    def activate_groups(self, request, queryset):
        queryset.update(status=FamilyGroup.GroupStatus.ACTIVE)
        self.message_user(request, f"{queryset.count()} family groups activated.")
    activate_groups.short_description = "Activate selected groups"

    def suspend_groups(self, request, queryset):
        queryset.update(status=FamilyGroup.GroupStatus.SUSPENDED)
        self.message_user(request, f"{queryset.count()} family groups suspended.")
    suspend_groups.short_description = "Suspend selected groups"


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = [
        "user", "family_group", "role", "is_active",
        "can_be_monitored", "alert_parent_on_threat", "joined_at",
    ]
    list_filter = ["role", "is_active", "can_be_monitored", "join_method"]
    search_fields = ["user__email", "user__full_name", "family_group__name"]
    readonly_fields = ["id", "joined_at", "created_at", "updated_at"]
    raw_id_fields = ["user", "family_group"]

    fieldsets = (
        ("Membership", {"fields": ("id", "family_group", "user", "role", "join_method", "joined_at")}),
        ("Permissions", {"fields": ("permissions", "is_active", "can_be_monitored", "alert_parent_on_threat")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
