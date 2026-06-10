"""
CyberDaddy - Family Circle Models
============================================================
Tables:
- family_groups    → A family unit managed by an admin
- family_members   → Individual members within a group

Design:
- Family Admin can add/remove members via invite codes
- Members have roles: parent, child, elderly, guardian
- Permissions are role-based (children have restricted access)
- Invite codes expire after INVITE_CODE_EXPIRY_HOURS
- Family group dashboard aggregates all members' safety data
"""

import uuid
import secrets
import string
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel, SoftDeleteModel


class FamilyGroup(TimeStampedModel):
    """
    Represents a family protection circle.
    One user (admin) creates and manages the group.
    """

    class GroupStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    # Identity
    name = models.CharField(max_length=100, help_text="Family group display name")
    description = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="family_avatars/", null=True, blank=True)

    # Ownership
    admin = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_family_group",
        help_text="The user who created and administers this family group"
    )

    # Invite System
    invite_code = models.CharField(
        max_length=12,
        unique=True,
        db_index=True,
        help_text="6-12 character unique invite code (case-insensitive)"
    )
    invite_code_expires_at = models.DateTimeField(null=True, blank=True)
    is_invite_active = models.BooleanField(default=True)

    # Settings
    max_members = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=GroupStatus.choices, default=GroupStatus.ACTIVE)

    # Aggregated Stats (updated by background tasks)
    average_safety_score = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    total_scans = models.PositiveIntegerField(default=0)
    threats_detected = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "family_groups"
        verbose_name = "Family Group"
        verbose_name_plural = "Family Groups"

    def __str__(self):
        return f"{self.name} (admin: {self.admin.email})"

    @staticmethod
    def generate_invite_code() -> str:
        """Generate a unique 8-character alphanumeric invite code."""
        chars = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(chars) for _ in range(8))

    def refresh_invite_code(self):
        """Regenerate invite code and reset expiry."""
        self.invite_code = self.generate_invite_code()
        self.invite_code_expires_at = timezone.now() + timezone.timedelta(
            hours=settings.INVITE_CODE_EXPIRY_HOURS
        )
        self.is_invite_active = True
        self.save(update_fields=["invite_code", "invite_code_expires_at", "is_invite_active"])

    @property
    def is_invite_valid(self):
        if not self.is_invite_active:
            return False
        if self.invite_code_expires_at and timezone.now() > self.invite_code_expires_at:
            return False
        return True

    @property
    def member_count(self):
        return self.members.filter(is_active=True).count()

    def is_full(self):
        return self.member_count >= self.max_members


class FamilyMember(TimeStampedModel):
    """
    Represents an individual member within a FamilyGroup.
    A user can be a member of one family group at a time.

    Role hierarchy for permission logic:
    - admin (set on FamilyGroup.admin) → Full access to family dashboard
    - parent → Can view all members' data, set restrictions for children
    - guardian → Like parent, but without admin capabilities
    - elderly → Full data access, optional simplified UI flag
    - child → Restricted access, parents are notified of threats
    """

    class MemberRole(models.TextChoices):
        PARENT = "parent", "Parent"
        GUARDIAN = "guardian", "Guardian"
        CHILD = "child", "Child"
        ELDERLY = "elderly", "Elderly"
        MEMBER = "member", "Member"  # Generic adult member

    class JoinMethod(models.TextChoices):
        INVITE_CODE = "invite_code", "Invite Code"
        DIRECT_ADD = "direct_add", "Directly Added by Admin"
        EMAIL_INVITE = "email_invite", "Email Invitation"

    # Relationships
    family_group = models.ForeignKey(
        FamilyGroup, on_delete=models.CASCADE, related_name="members"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="family_membership",
        help_text="One user can belong to only one family group"
    )

    # Role & Permissions
    role = models.CharField(
        max_length=20, choices=MemberRole.choices, default=MemberRole.MEMBER
    )

    # Permissions (stored as JSON for fine-grained control)
    permissions = models.JSONField(
        default=dict,
        help_text="Fine-grained permission overrides for this member"
    )

    # Status
    is_active = models.BooleanField(default=True)
    join_method = models.CharField(
        max_length=20, choices=JoinMethod.choices, default=JoinMethod.INVITE_CODE
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    # Safety Monitoring
    can_be_monitored = models.BooleanField(
        default=True,
        help_text="If True, this member's activity appears on family dashboard"
    )
    alert_parent_on_threat = models.BooleanField(
        default=True,
        help_text="If True, parents/guardians are alerted when this member encounters a threat"
    )

    class Meta:
        db_table = "family_members"
        verbose_name = "Family Member"
        verbose_name_plural = "Family Members"
        unique_together = [["family_group", "user"]]

    def __str__(self):
        return f"{self.user.full_name} [{self.role}] in {self.family_group.name}"

    def get_default_permissions(self) -> dict:
        """Return default permissions based on role."""
        base = {
            "can_view_own_scans": True,
            "can_run_scans": True,
            "can_view_family_dashboard": False,
            "can_manage_members": False,
            "can_view_billing": False,
        }
        if self.role in [self.MemberRole.PARENT, self.MemberRole.GUARDIAN]:
            base.update({
                "can_view_family_dashboard": True,
                "can_view_members_scans": True,
            })
        return base
