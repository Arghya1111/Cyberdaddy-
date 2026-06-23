"""
CyberDaddy - Custom Permission Classes
============================================================
Permission classes control access at the view level.
Used throughout all apps for role-based access control.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.subscriptions.models import Subscription


class IsEmailVerified(BasePermission):
    """
    Allow access only to users with verified email addresses.
    # TODO: Re-enable email verification in production
    When REQUIRE_EMAIL_VERIFICATION=False (dev/test) this gate is bypassed
    entirely so all authenticated users can access protected endpoints.
    """
    message = "Please verify your email address to access this feature."

    def has_permission(self, request, view):
        from django.conf import settings
        # TODO: Re-enable email verification in production
        if not getattr(settings, 'REQUIRE_EMAIL_VERIFICATION', True):
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_email_verified
        )


class HasActiveSubscription(BasePermission):
    """Allow access only to users with an active subscription (any paid plan)."""
    message = "This feature requires an active subscription."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.subscription.is_active
        except Exception:
            return False


class HasPremiumPlan(BasePermission):
    """Allow access only to Premium, Family, or Enterprise subscribers."""
    message = "This feature requires a Premium or higher subscription."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            plan = request.user.subscription.plan
            return plan in [
                Subscription.Plan.PREMIUM,
                Subscription.Plan.FAMILY,
                Subscription.Plan.ENTERPRISE,
            ]
        except Exception:
            return False


class HasFamilyPlan(BasePermission):
    """Allow access only to Family or Enterprise subscribers."""
    message = "This feature requires a Family or Enterprise plan."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            plan = request.user.subscription.plan
            return plan in [Subscription.Plan.FAMILY, Subscription.Plan.ENTERPRISE]
        except Exception:
            return False


class IsFamilyAdmin(BasePermission):
    """Allow access only to users who administer a family group."""
    message = "This action requires Family Admin privileges."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, "managed_family_group")


class IsFamilyMember(BasePermission):
    """Allow access only to users who belong to a family group."""
    message = "You must be part of a family group to access this feature."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, "family_membership")


class IsFamilyAdminOrParent(BasePermission):
    """Allow access to family admins and parent-role members."""
    message = "This action requires Family Admin or Parent role."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if hasattr(request.user, "managed_family_group"):
            return True
        try:
            from apps.family.models import FamilyMember
            membership = request.user.family_membership
            return membership.role in [
                FamilyMember.MemberRole.PARENT,
                FamilyMember.MemberRole.GUARDIAN,
            ]
        except Exception:
            return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission: owner can write, others read.
    Requires the object to have a `user` attribute.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.user == request.user


class IsScanOwner(BasePermission):
    """Allow access only to the user who created the scan."""
    message = "You do not have permission to access this scan."

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class HasScanQuota(BasePermission):
    """Allow scan creation only if user has remaining scan quota."""
    message = "You have reached your scan limit. Please upgrade your plan."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.subscription.has_scans_remaining
        except Exception:
            return False
