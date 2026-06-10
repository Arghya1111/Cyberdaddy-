"""
CyberDaddy - Payments URLs
"""

from django.urls import path
from .views import (
    CreateStripeSubscriptionView, CreateRazorpayOrderView,
    VerifyRazorpayPaymentView,
    StripeWebhookView, RazorpayWebhookView,
    PaymentHistoryView,
)

app_name = "payments"

urlpatterns = [
    # Stripe
    path("stripe/subscribe/", CreateStripeSubscriptionView.as_view(), name="stripe-subscribe"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),

    # Razorpay
    path("razorpay/order/", CreateRazorpayOrderView.as_view(), name="razorpay-order"),
    path("razorpay/verify/", VerifyRazorpayPaymentView.as_view(), name="razorpay-verify"),
    path("razorpay/webhook/", RazorpayWebhookView.as_view(), name="razorpay-webhook"),

    # Transaction History
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
]
