from django.contrib import admin

from .models import (
    BankStatement,
    Transaction,
    FinancialAnalysis,
    CategorySummary,
    MonthlySummary
)


@admin.register(BankStatement)
class BankStatementAdmin(admin.ModelAdmin):

    list_display = [
        "id",
        "user",
        "file_name",
        "status",
        "total_transactions",
        "uploaded_at"
    ]

    list_filter = [
        "status",
        "uploaded_at"
    ]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):

    list_display = [
        "transaction_date",
        "description",
        "debit",
        "credit",
        "category",
        "transaction_type"
    ]

    list_filter = [
        "category",
        "transaction_type"
    ]

    search_fields = [
        "description",
        "merchant"
    ]


@admin.register(FinancialAnalysis)
class FinancialAnalysisAdmin(admin.ModelAdmin):

    list_display = [
        "statement",
        "total_income",
        "total_expenses",
        "net_cash_flow",
        "savings_rate"
    ]


@admin.register(CategorySummary)
class CategorySummaryAdmin(admin.ModelAdmin):

    list_display = [
        "category",
        "total_amount",
        "transaction_count",
        "percentage"
    ]


@admin.register(MonthlySummary)
class MonthlySummaryAdmin(admin.ModelAdmin):

    list_display = [
        "year",
        "month_name",
        "income",
        "expenses",
        "cash_flow"
    ]