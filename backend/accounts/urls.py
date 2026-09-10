from django.urls import path

from .views import (
    SignupView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
    ProfileView,
)


urlpatterns = [

    path(
        "signup/",
        SignupView.as_view(),
        name="signup"
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),

    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password"
    ),

    path(
        "reset-password/",
        ResetPasswordView.as_view(),
        name="reset-password"
    ),

    path(
        "profile/",
        ProfileView.as_view(),
        name="profile"
    ),
]
