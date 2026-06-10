"""
CyberDaddy - Notifications URLs
"""

from django.urls import path
from .views import (
    NotificationListView, MarkNotificationReadView,
    MarkAllNotificationsReadView, UnreadCountView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", UnreadCountView.as_view(), name="unread-count"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="mark-all-read"),
    path("<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="mark-read"),
]
