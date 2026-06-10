"""
CyberDaddy - Subscriptions URLs
"""

from django.urls import path
from .views import SubscriptionDetailView, PlansListView, CancelSubscriptionView

app_name = "subscriptions"

urlpatterns = [
    path("plans/", PlansListView.as_view(), name="plans-list"),
    path("me/", SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("cancel/", CancelSubscriptionView.as_view(), name="cancel"),
]
