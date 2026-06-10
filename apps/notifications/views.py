"""
CyberDaddy - Notifications Views & URLs
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from drf_spectacular.utils import extend_schema

from .models import Notification
from apps.core.pagination import StandardResultsSetPagination


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "body",
            "channel", "priority", "status",
            "data", "sent_at", "read_at",
            "related_scan_id", "created_at",
        ]
        read_only_fields = fields


class NotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/ — List all notifications for current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    @extend_schema(tags=["Notifications"], summary="List user notifications")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class MarkNotificationReadView(APIView):
    """POST /api/v1/notifications/<id>/read/ — Mark notification as read."""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"], summary="Mark notification as read")
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            notification.mark_as_read()
            return Response({"success": True})
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Not found."}},
                status=status.HTTP_404_NOT_FOUND
            )


class MarkAllNotificationsReadView(APIView):
    """POST /api/v1/notifications/read-all/ — Mark all notifications as read."""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"], summary="Mark all notifications as read")
    def post(self, request):
        from django.utils import timezone
        count = Notification.objects.filter(
            user=request.user
        ).exclude(
            status=Notification.Status.READ
        ).update(
            status=Notification.Status.READ,
            read_at=timezone.now()
        )
        return Response({"success": True, "marked_read": count})


class UnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/ — Unread notification badge count."""
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"], summary="Get unread notification count")
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
        ).exclude(status=Notification.Status.READ).count()
        return Response({"unread_count": count})
