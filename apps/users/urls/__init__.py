"""
CyberDaddy - Users App URL configuration
Combines auth and user-profile URL sub-modules.
"""

from django.urls import path, include

app_name = "users"

urlpatterns = [
    path("auth/", include("apps.users.urls.auth_urls")),
    path("", include("apps.users.urls.user_urls")),
]
