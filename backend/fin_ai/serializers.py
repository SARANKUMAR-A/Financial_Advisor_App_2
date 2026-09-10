import pandas as pd

from decimal import Decimal
from django.db import transaction as db_transaction
from django.db.models import Sum, Count
from django.db.models.functions import ExtractYear, ExtractMonth
    
from rest_framework import serializers

from .models import (
    BankStatement,
    Transaction,
    FinancialAnalysis,
    CategorySummary,
    MonthlySummary
)

from .ollama_service import (
    categorize_transaction,
    generate_financial_insight
)


def clean_amount(value):

    if pd.isna(value):
        return Decimal("0")

    if isinstance(value, str):

        value = (
            value
            .replace("₹", "")
            .replace(",", "")
            .replace(" ", "")
            .strip()
        )

        if value in ["", "-", "NA"]:
            return Decimal("0")

    try:
        return Decimal(
            str(value)
        )

    except Exception:
        return Decimal("0")


def find_column(df, possible_names):

    normalized = {
        str(column).strip().lower().replace(
            " ", "_"
        ): column
        for column in df.columns
    }

    for name in possible_names:

        if name in normalized:
            return normalized[name]

    return None


def process_statement(statement):

    statement.status = "PROCESSING"
    statement.save(
        update_fields=["status"]
    )

    try:

        df = pd.read_excel(
            statement.original_file.path
        )

        df = df.dropna(
            how="all"
        )

        # Normalize columns
        df.columns = [
            str(column)
            .strip()
            .lower()
            .replace(" ", "_")
            for column in df.columns
        ]

        date_column = find_column(
            df,
            [
                "date",
                "transaction_date",
                "txn_date",
                "value_date"
            ]
        )

        description_column = find_column(
            df,
            [
                "description",
                "narration",
                "transaction_details",
                "remarks",
                "particulars"
            ]
        )

        debit_column = find_column(
            df,
            [
                "debit",
                "debit_amount",
                "withdrawal",
                "withdrawals"
            ]
        )

        credit_column = find_column(
            df,
            [
                "credit",
                "credit_amount",
                "deposit",
                "deposits"
            ]
        )

        balance_column = find_column(
            df,
            [
                "balance",
                "closing_balance"
            ]
        )

        if not date_column:
            raise ValueError(
                "Transaction date column not found."
            )

        if not description_column:
            raise ValueError(
                "Description column not found."
            )

        if not debit_column and not credit_column:
            raise ValueError(
                "Debit/Credit columns not found."
            )

        created_transactions = []

        for _, row in df.iterrows():

            date_value = pd.to_datetime(
                row[date_column],
                errors="coerce"
            )

            if pd.isna(date_value):
                continue

            description = str(
                row[description_column]
            ).strip()

            if not description or description == "nan":
                continue

            debit = (
                clean_amount(
                    row[debit_column]
                )
                if debit_column
                else Decimal("0")
            )

            credit = (
                clean_amount(
                    row[credit_column]
                )
                if credit_column
                else Decimal("0")
            )

            balance = None

            if balance_column:

                balance = clean_amount(
                    row[balance_column]
                )

            transaction_type = (
                "CREDIT"
                if credit > 0
                else "DEBIT"
            )

            # AI categorization
            ai_result = categorize_transaction(
                description,
                credit if credit > 0 else debit
            )

            transaction_obj = Transaction(
                statement=statement,

                transaction_date=date_value.date(),

                description=description,

                debit=debit,

                credit=credit,

                balance=balance,

                transaction_type=transaction_type,

                category=ai_result["category"],

                merchant=ai_result["merchant"],

                ai_confidence=ai_result["confidence"],

                ai_reason=ai_result["reason"]
            )

            created_transactions.append(
                transaction_obj
            )

        Transaction.objects.bulk_create(
            created_transactions,
            batch_size=500
        )

        statement.total_transactions = len(
            created_transactions
        )

        if created_transactions:

            statement.statement_from = min(
                t.transaction_date
                for t in created_transactions
            )

            statement.statement_to = max(
                t.transaction_date
                for t in created_transactions
            )

        statement.save()

        # Calculate financial analysis
        analysis = calculate_analysis(
            statement
        )

        statement.status = "COMPLETED"

        statement.save(
            update_fields=["status"]
        )

        return analysis

    except Exception as error:

        statement.status = "FAILED"

        statement.error_message = str(
            error
        )

        statement.save(
            update_fields=[
                "status",
                "error_message"
            ]
        )

        raise


def calculate_analysis(statement):

    transactions = statement.transactions.all()

    total_income = sum(
        (
            transaction.credit
            for transaction in transactions
        ),
        Decimal("0")
    )

    total_expenses = sum(
        (
            transaction.debit
            for transaction in transactions
        ),
        Decimal("0")
    )

    net_cash_flow = (
        total_income -
        total_expenses
    )

    transaction_count = (
        transactions.count()
    )

    largest_expense = max(
        (
            transaction.debit
            for transaction in transactions
        ),
        default=Decimal("0")
    )

    largest_income = max(
        (
            transaction.credit
            for transaction in transactions
        ),
        default=Decimal("0")
    )

    if total_income > 0:

        savings_rate = (
            net_cash_flow /
            total_income
        ) * 100

    else:
        savings_rate = Decimal("0")

    monthly_count = (
        transactions
        .dates(
            "transaction_date",
            "month"
        )
        .count()
    )

    average_monthly_income = (
        total_income / monthly_count
        if monthly_count
        else Decimal("0")
    )

    average_monthly_expense = (
        total_expenses / monthly_count
        if monthly_count
        else Decimal("0")
    )

    first_transaction = (
        transactions
        .order_by(
            "transaction_date"
        )
        .first()
    )

    last_transaction = (
        transactions
        .order_by(
            "-transaction_date"
        )
        .first()
    )

    analysis, _ = (
        FinancialAnalysis.objects.update_or_create(
            statement=statement,
            defaults={
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_cash_flow": net_cash_flow,
                "average_monthly_income": average_monthly_income,
                "average_monthly_expense": average_monthly_expense,
                "largest_expense": largest_expense,
                "largest_income": largest_income,
                "savings_rate": savings_rate,

                "opening_balance": (
                    first_transaction.balance
                    if first_transaction
                    else None
                ),

                "closing_balance": (
                    last_transaction.balance
                    if last_transaction
                    else None
                )
            }
        )
    )

    create_category_summaries(
        analysis
    )

    create_monthly_summaries(
        analysis
    )

    categories = list(
        CategorySummary.objects
        .filter(analysis=analysis)
        .values(
            "category",
            "total_amount",
            "transaction_count"
        )
    )

    ai_result = generate_financial_insight({
        "total_income": str(
            total_income
        ),
        "total_expenses": str(
            total_expenses
        ),
        "net_cash_flow": str(
            net_cash_flow
        ),
        "savings_rate": str(
            savings_rate
        ),
        "largest_expense": str(
            largest_expense
        ),
        "categories": categories
    })

    analysis.ai_summary = ai_result.get(
        "summary",
        ""
    )

    analysis.ai_recommendations = (
        ai_result.get(
            "recommendations",
            []
        )
    )

    analysis.save()

    return analysis


def create_category_summaries(analysis):

    CategorySummary.objects.filter(
        analysis=analysis
    ).delete()

    transactions = (
        analysis.statement
        .transactions
        .filter(debit__gt=0)
    )

    total_expenses = transactions.aggregate(
        total=Sum("debit")
    )["total"] or Decimal("0")

    grouped = (
        transactions
        .values("category")
        .annotate(
            total_amount=Sum("debit"),
            transaction_count=Count("id")
        )
        .order_by("-total_amount")
    )

    objects = []

    for item in grouped:

        amount = item["total_amount"]

        percentage = (
            (amount / total_expenses) * 100
            if total_expenses > 0
            else Decimal("0")
        )

        objects.append(
            CategorySummary(
                analysis=analysis,
                category=item["category"],
                total_amount=amount,
                transaction_count=item[
                    "transaction_count"
                ],
                percentage=percentage
            )
        )

    CategorySummary.objects.bulk_create(
        objects
    )


def create_monthly_summaries(analysis):

    MonthlySummary.objects.filter(
        analysis=analysis
    ).delete()

    transactions = (
        analysis.statement
        .transactions
        .all()
    )

    grouped = (
        transactions
        .annotate(
            year=ExtractYear(
                "transaction_date"
            ),
            month=ExtractMonth(
                "transaction_date"
            )
        )
        .values(
            "year",
            "month"
        )
        .annotate(
            income=Sum("credit"),
            expenses=Sum("debit")
        )
        .order_by(
            "year",
            "month"
        )
    )

    month_names = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ]

    objects = []

    for item in grouped:

        income = (
            item["income"] or Decimal("0")
        )

        expenses = (
            item["expenses"] or Decimal("0")
        )

        objects.append(
            MonthlySummary(
                analysis=analysis,
                year=item["year"],
                month=item["month"],
                month_name=month_names[
                    item["month"]
                ],
                income=income,
                expenses=expenses,
                cash_flow=income - expenses
            )
        )

    MonthlySummary.objects.bulk_create(
        objects
    )


class BankStatementSerializer(serializers.ModelSerializer):

    class Meta:
        model = BankStatement

        fields = [
            "id",
            "file_name",
            "original_file",
            "uploaded_at",
            "statement_from",
            "statement_to",
            "total_transactions",
            "status",
            "error_message",
        ]

        read_only_fields = [
            "id",
            "file_name",
            "uploaded_at",
            "statement_from",
            "statement_to",
            "total_transactions",
            "status",
            "error_message",
        ]


class TransactionSerializer(serializers.ModelSerializer):

    amount = serializers.SerializerMethodField()

    class Meta:
        model = Transaction

        fields = [
            "id",
            "transaction_date",
            "description",
            "debit",
            "credit",
            "amount",
            "balance",
            "transaction_type",
            "category",
            "sub_category",
            "merchant",
            "ai_confidence",
            "ai_reason",
        ]

    def get_amount(self, obj):

        if obj.transaction_type == "CREDIT":
            return obj.credit

        return -obj.debit


class CategorySummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = CategorySummary

        fields = [
            "category",
            "total_amount",
            "transaction_count",
            "percentage",
        ]


class MonthlySummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = MonthlySummary

        fields = [
            "year",
            "month",
            "month_name",
            "income",
            "expenses",
            "cash_flow",
        ]


class FinancialAnalysisSerializer(serializers.ModelSerializer):

    categories = CategorySummarySerializer(
        many=True,
        read_only=True,
    )

    monthly = MonthlySummarySerializer(
        source="monthly_summaries",
        many=True,
        read_only=True,
    )

    class Meta:
        model = FinancialAnalysis

        fields = [
            "id",
            "total_income",
            "total_expenses",
            "net_cash_flow",
            "average_monthly_income",
            "average_monthly_expense",
            "largest_expense",
            "largest_income",
            "savings_rate",
            "opening_balance",
            "closing_balance",
            "ai_summary",
            "ai_recommendations",
            "categories",
            "monthly",
            "created_at",
            "updated_at",
        ]