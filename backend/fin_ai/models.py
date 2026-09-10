from django.db import models
from django.contrib.auth.models import User


class BankStatement(models.Model):

    STATUS_CHOICES = [
        ("UPLOADED", "Uploaded"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bank_statements"
    )

    original_file = models.FileField(
        upload_to="bank_statements/"
    )

    file_name = models.CharField(
        max_length=255
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    statement_from = models.DateField(
        null=True,
        blank=True
    )

    statement_to = models.DateField(
        null=True,
        blank=True
    )

    total_transactions = models.IntegerField(
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="UPLOADED"
    )

    error_message = models.TextField(
        blank=True,
        null=True
    )

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.file_name


class Transaction(models.Model):

    TRANSACTION_TYPES = [
        ("CREDIT", "Credit"),
        ("DEBIT", "Debit"),
    ]

    statement = models.ForeignKey(
        BankStatement,
        on_delete=models.CASCADE,
        related_name="transactions"
    )

    transaction_date = models.DateField()

    description = models.TextField()

    debit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    credit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPES
    )

    category = models.CharField(
        max_length=100,
        default="Other"
    )

    sub_category = models.CharField(
        max_length=100,
        blank=True
    )

    merchant = models.CharField(
        max_length=255,
        blank=True
    )

    ai_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    ai_reason = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = [
            "-transaction_date",
            "-id"
        ]

    def __str__(self):
        return self.description


class FinancialAnalysis(models.Model):

    statement = models.OneToOneField(
        BankStatement,
        on_delete=models.CASCADE,
        related_name="analysis"
    )

    total_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    total_expenses = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    net_cash_flow = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    average_monthly_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    average_monthly_expense = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    largest_expense = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    largest_income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    savings_rate = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0
    )

    opening_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    closing_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    ai_summary = models.TextField(
        blank=True
    )

    ai_recommendations = models.JSONField(
        default=list,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"Analysis - {self.statement.file_name}"


class CategorySummary(models.Model):

    analysis = models.ForeignKey(
        FinancialAnalysis,
        on_delete=models.CASCADE,
        related_name="categories"
    )

    category = models.CharField(
        max_length=100
    )

    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2
    )

    transaction_count = models.IntegerField(
        default=0
    )

    percentage = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0
    )

    def __str__(self):
        return self.category


class MonthlySummary(models.Model):

    analysis = models.ForeignKey(
        FinancialAnalysis,
        on_delete=models.CASCADE,
        related_name="monthly_summaries"
    )

    year = models.IntegerField()

    month = models.IntegerField()

    month_name = models.CharField(
        max_length=20
    )

    income = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    expenses = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    cash_flow = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0
    )

    def __str__(self):
        return f"{self.month_name} {self.year}"