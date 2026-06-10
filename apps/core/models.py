"""
CyberDaddy - Core Base Models
============================================================
All app models inherit from these base classes to ensure:
- UUID primary keys (instead of auto-increment integers)
- Automatic created_at/updated_at timestamps
- Soft delete support
- Consistent __str__ representations
"""

import uuid
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """
    Abstract base model with automatic timestamp fields.
    All CyberDaddy models extend this class.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier (UUID v4)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Record creation timestamp"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Record last update timestamp"
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def with_deleted(self):
        """Return all records including soft-deleted ones."""
        return super().get_queryset()

    def deleted_only(self):
        """Return only soft-deleted records."""
        return super().get_queryset().filter(deleted_at__isnull=False)


class SoftDeleteModel(TimeStampedModel):
    """
    Abstract model that supports soft deletion.
    Records are never physically deleted — only marked with deleted_at.
    This is critical for audit trails and compliance requirements.
    """
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Soft deletion timestamp. NULL means active."
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Access all records including deleted

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Override delete to perform soft deletion."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the record from the database."""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted record."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    @property
    def is_deleted(self):
        return self.deleted_at is not None
