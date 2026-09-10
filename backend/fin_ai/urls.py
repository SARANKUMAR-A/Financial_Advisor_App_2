from django.urls import path

from .views import (
    StatementUploadView,
    StatementStatusView,
    StatementListView,
    StatementDetailView,
    DashboardView,
    TransactionListView,
    CategoryView,
    MonthlyView,
    InsightsView
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [

    path(
        "statements/upload/",
        StatementUploadView.as_view(),
        name="statement-upload"
    ),

    path(
        "statements/<int:statement_id>/status/",
        StatementStatusView.as_view(),
        name="statement-status",
    ),

    path(
        "statements/",
        StatementListView.as_view(),
        name="statement-list"
    ),

    path(
        "statements/<int:pk>/",
        StatementDetailView.as_view(),
        name="statement-detail"
    ),

    path(
        "dashboard/",
        DashboardView.as_view(),
        name="dashboard"
    ),

    path(
        "transactions/",
        TransactionListView.as_view(),
        name="transactions"
    ),

    path(
        "categories/",
        CategoryView.as_view(),
        name="categories"
    ),

    path(
        "monthly/",
        MonthlyView.as_view(),
        name="monthly"
    ),

    path(
        "insights/",
        InsightsView.as_view(),
        name="insights"
    ),
    path(
        "token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
]