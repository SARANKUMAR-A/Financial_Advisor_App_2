import os
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db.models import Q, F, ExpressionWrapper, DecimalField
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from .background_tasks import (
    run_background_task,
    process_bank_statement_background,
)

from .models import (
    BankStatement,
    Transaction,
    FinancialAnalysis,
)

from .serializers import (
    BankStatementSerializer,
    TransactionSerializer,
)

from .services import process_statement
from .ollama_service import (
    generate_financial_insight,
    check_ollama_status,
)


# ============================================================
# Helper Functions
# ============================================================

def parse_date(value):
    """
    Convert different date formats from the XLS file
    into a Python datetime/date-compatible value.
    """

    if not value:
        return None

    if hasattr(value, "date"):
        try:
            return value.date()
        except Exception:
            pass

    value = str(value).strip()

    formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d/%m/%y",
        "%d-%m-%y",
    ]

    for date_format in formats:
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue

    return None


def decimal_value(value):
    """
    Safely convert amount values into Decimal.
    """

    if value is None:
        return Decimal("0.00")

    try:
        value = str(value).replace(",", "").strip()

        if not value:
            return Decimal("0.00")

        return Decimal(value)

    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def get_user_statement(request, statement_id=None):
    """
    Get a statement belonging only to the logged-in user.
    """

    queryset = BankStatement.objects.filter(
        user=request.user
    )

    if statement_id:
        queryset = queryset.filter(
            id=statement_id
        )

    return queryset.order_by(
        "-uploaded_at"
    ).first()


def get_latest_completed_statement(request):
    """
    Return the latest completed statement for the user.
    """

    return (
        BankStatement.objects
        .filter(
            user=request.user,
            status="COMPLETED",
        )
        .order_by("-uploaded_at")
        .first()
    )


# ============================================================
# XLS / XLSX Upload
# ============================================================


class StatementUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        print("====================================")
        print("STATEMENT UPLOAD STARTED")
        print("====================================")

        uploaded_file = request.FILES.get("file")

        print(
            "Uploaded file:",
            uploaded_file
        )

        if not uploaded_file:

            return Response(
                {
                    "success": False,
                    "message": "No file uploaded."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            # -------------------------------------------------
            # CREATE BANK STATEMENT
            # -------------------------------------------------

            statement = BankStatement.objects.create(
                user=request.user,

                # IMPORTANT:
                # Store the uploaded XLS in original_file
                original_file=uploaded_file,

                # Keep filename if your model has this field
                file_name=uploaded_file.name,

                status="PENDING",
            )

            print("====================================")
            print("FILE SAVED")
            print(
                "Statement ID:",
                statement.id
            )

            print(
                "Original File:",
                statement.original_file.name
            )

            print(
                "File:",
                uploaded_file.name
            )

            print(
                "File Path:",
                statement.original_file.path
            )

            print(
                "File Exists:",
                os.path.exists(
                    statement.original_file.path
                )
            )

            print("====================================")

            # -------------------------------------------------
            # START BACKGROUND PROCESSING
            # -------------------------------------------------

            print(
                "Submitting background task..."
            )

            run_background_task(
                process_bank_statement_background,
                statement.id,
            )

            print(
                "Background task submitted."
            )

            # -------------------------------------------------
            # RETURN IMMEDIATELY
            # -------------------------------------------------

            return Response(
                {
                    "success": True,
                    "message": (
                        "Statement uploaded successfully. "
                        "Processing started in background."
                    ),
                    "statement_id": statement.id,
                    "file_name": statement.file_name,
                    "status": statement.status,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        except Exception as error:

            print(
                "===================================="
            )

            print(
                "STATEMENT UPLOAD FAILED"
            )

            print(
                "Error:",
                repr(error)
            )

            print(
                "===================================="
            )

            return Response(
                {
                    "success": False,
                    "message": str(error),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StatementStatusView(APIView):

    def get(self, request, statement_id):

        try:

            statement = BankStatement.objects.get(
                id=statement_id,
                user=request.user,
            )

        except BankStatement.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Statement not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            {
                "success": True,
                "statement_id": statement.id,
                "file_name": statement.file_name,
                "status": statement.status,
            }
        )


# ============================================================
# Statement List
# ============================================================

class StatementListView(APIView):

    def get(self, request):

        statements = (
            BankStatement.objects
            .filter(
                user=request.user
            )
            .order_by("-uploaded_at")
        )

        serializer = BankStatementSerializer(
            statements,
            many=True,
        )

        return Response(
            {
                "success": True,
                "count": statements.count(),
                "statements": serializer.data,
            }
        )


# ============================================================
# Statement Detail
# ============================================================

class StatementDetailView(APIView):

    def get(self, request, pk):

        try:

            statement = (
                BankStatement.objects
                .get(
                    id=pk,
                    user=request.user,
                )
            )

        except BankStatement.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Statement not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        analysis = getattr(
            statement,
            "analysis",
            None,
        )

        transactions = (
            statement.transactions
            .all()
            .order_by(
                "transaction_date",
                "id",
            )
        )

        return Response(
            {
                "success": True,

                "statement": (
                    BankStatementSerializer(
                        statement
                    ).data
                ),

                "analysis": (
                    self.get_analysis(
                        analysis
                    )
                ),

                "transactions": (
                    TransactionSerializer(
                        transactions,
                        many=True,
                    ).data
                ),

                "transaction_count": (
                    transactions.count()
                ),
            }
        )

    @staticmethod
    def get_analysis(analysis):

        if not analysis:
            return None

        return {
            "total_income": (
                analysis.total_income
            ),

            "total_expenses": (
                analysis.total_expenses
            ),

            "net_cash_flow": (
                analysis.net_cash_flow
            ),

            "savings_rate": (
                analysis.savings_rate
            ),

            "opening_balance": (
                analysis.opening_balance
            ),

            "closing_balance": (
                analysis.closing_balance
            ),

            "ai_summary": (
                analysis.ai_summary
            ),

            "ai_recommendations": (
                analysis.ai_recommendations
            ),
        }


# ============================================================
# Dashboard
# ============================================================

class DashboardView(APIView):

    def get(self, request):

        statement_id = request.query_params.get("statement_id")

        if statement_id:
            statement = (
                BankStatement.objects
                .filter(
                    id=statement_id,
                    user=request.user,
                    status="COMPLETED",
                )
                .first()
            )
        else:
            statement = get_latest_completed_statement(
                request
            )

        if not statement:

            return Response(
                {
                    "success": True,
                    "has_data": False,
                    "message": (
                        "Upload a bank statement "
                        "to view your dashboard."
                    ),
                }
            )

        analysis = getattr(
            statement,
            "analysis",
            None,
        )

        if not analysis:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Financial analysis "
                        "is not available."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        categories = list(
            analysis.categories
            .values(
                "category",
                "total_amount",
                "transaction_count",
                "percentage",
            )
        )

        monthly = list(
            analysis.monthly_summaries
            .values(
                "year",
                "month",
                "month_name",
                "income",
                "expenses",
                "cash_flow",
            )
            .order_by(
                "year",
                "month",
            )
        )

        recent_transactions = (
            statement.transactions
            .all()
            .order_by(
                "-transaction_date",
                "-id",
            )[:25]
        )

        transaction_count = (
            statement.transactions.count()
        )

        # ----------------------------------------------------
        # Additional XLS based totals
        # ----------------------------------------------------

        total_deposits = (
            statement.transactions
            .aggregate_total_deposits()
            if hasattr(
                statement.transactions,
                "aggregate_total_deposits",
            )
            else None
        )

        return Response(
            {
                "success": True,
                "has_data": True,

                "statement": {
                    "id": statement.id,
                    "file_name": (
                        statement.file_name
                    ),
                    "uploaded_at": (
                        statement.uploaded_at
                    ),
                    "from": (
                        statement.statement_from
                    ),
                    "to": (
                        statement.statement_to
                    ),
                },

                "cards": {
                    "total_income": (
                        analysis.total_income
                    ),
                    "total_expenses": (
                        analysis.total_expenses
                    ),
                    "net_cash_flow": (
                        analysis.net_cash_flow
                    ),
                    "savings_rate": (
                        analysis.savings_rate
                    ),
                    "opening_balance": (
                        analysis.opening_balance
                    ),
                    "closing_balance": (
                        analysis.closing_balance
                    ),
                    "transaction_count": (
                        transaction_count
                    ),
                },

                "categories": categories,

                "monthly": monthly,

                "recent_transactions": (
                    TransactionSerializer(
                        recent_transactions,
                        many=True,
                    ).data
                ),

                "insights": {
                    "summary": (
                        analysis.ai_summary
                    ),
                    "recommendations": (
                        analysis.ai_recommendations
                    ),
                    "is_local": True,
                    "model": "llama3.2 (Local Ollama)",
                    "statement_id": statement.id,
                },
            }
        )


# ============================================================
# Transaction List
# ============================================================

class TransactionListView(APIView):

    def get(self, request):

        statement_id = request.query_params.get(
            "statement_id"
        )

        search = request.query_params.get(
            "search",
            "",
        ).strip()

        category = request.query_params.get(
            "category",
            "",
        ).strip()

        transaction_type = request.query_params.get(
            "type",
            "",
        ).strip().lower()

        start_date = request.query_params.get(
            "start_date"
        )

        end_date = request.query_params.get(
            "end_date"
        )

        min_amount = request.query_params.get(
            "min_amount"
        )

        max_amount = request.query_params.get(
            "max_amount"
        )

        # ----------------------------------------------------
        # Base queryset
        # ----------------------------------------------------

        transactions = (
            Transaction.objects
            .filter(
                statement__user=request.user
            )
            .select_related("statement")
        )

        # ----------------------------------------------------
        # Statement filter
        # ----------------------------------------------------

        active_statement = None

        if statement_id:
            if str(statement_id).lower() != "all":
                transactions = transactions.filter(
                    statement_id=statement_id
                )
                active_statement = (
                    BankStatement.objects
                    .filter(
                        id=statement_id,
                        user=request.user,
                    )
                    .first()
                )
        else:
            latest_statement = get_latest_completed_statement(request)
            if latest_statement:
                transactions = transactions.filter(
                    statement_id=latest_statement.id
                )
                active_statement = latest_statement

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:

            transactions = transactions.filter(
                Q(description__icontains=search)
                | Q(merchant__icontains=search)
                | Q(category__icontains=search)
                | Q(sub_category__icontains=search)
            )

        # ----------------------------------------------------
        # Category
        # ----------------------------------------------------

        if category:

            transactions = transactions.filter(
                category__iexact=category
            )

        # ----------------------------------------------------
        # Transaction type
        # ----------------------------------------------------

        if transaction_type in (
            "income",
            "deposit",
            "credit",
        ):

            transactions = transactions.filter(
                Q(transaction_type__iexact="CREDIT")
                | Q(credit__gt=0)
            )

        elif transaction_type in (
            "expense",
            "withdrawal",
            "debit",
        ):

            transactions = transactions.filter(
                Q(transaction_type__iexact="DEBIT")
                | Q(debit__gt=0)
            )

        # ----------------------------------------------------
        # Date filters
        # ----------------------------------------------------

        parsed_start_date = parse_date(
            start_date
        )

        parsed_end_date = parse_date(
            end_date
        )

        if parsed_start_date:

            transactions = transactions.filter(
                transaction_date__gte=parsed_start_date
            )

        if parsed_end_date:

            transactions = transactions.filter(
                transaction_date__lte=parsed_end_date
            )

        # ----------------------------------------------------
        # Amount filters
        # ----------------------------------------------------

        if min_amount:

            try:

                amount = Decimal(
                    min_amount
                )

                transactions = transactions.filter(
                    Q(
                        debit__gte=amount
                    )
                    |
                    Q(
                        credit__gte=amount
                    )
                )

            except InvalidOperation:
                pass

        if max_amount:

            try:

                amount = Decimal(
                    max_amount
                )

                transactions = transactions.filter(
                    Q(
                        debit__lte=amount
                    )
                    |
                    Q(
                        credit__lte=amount
                    )
                )

            except InvalidOperation:
                pass

        # ----------------------------------------------------
        # Sorting
        # ----------------------------------------------------

        sort_by = request.query_params.get("sort_by", "date").strip().lower()
        sort_dir = request.query_params.get("sort_dir", "desc").strip().lower()
        is_asc = sort_dir == "asc"

        if sort_by == "amount":
            transactions = transactions.annotate(
                net_amount=ExpressionWrapper(
                    F("credit") - F("debit"),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
            order_field = "net_amount" if is_asc else "-net_amount"
            transactions = transactions.order_by(order_field, "-id")

        elif sort_by == "description":
            order_field = "description" if is_asc else "-description"
            transactions = transactions.order_by(order_field, "-id")

        elif sort_by == "category":
            order_field = "category" if is_asc else "-category"
            transactions = transactions.order_by(order_field, "-id")

        else:
            order_field = "transaction_date" if is_asc else "-transaction_date"
            transactions = transactions.order_by(order_field, "-id")

        # ----------------------------------------------------
        # Pagination
        # ----------------------------------------------------

        paginator = PageNumberPagination()

        paginator.page_size = int(
            request.query_params.get(
                "page_size",
                50,
            )
        )

        paginated_transactions = (
            paginator.paginate_queryset(
                transactions,
                request,
            )
        )

        serializer = TransactionSerializer(
            paginated_transactions,
            many=True,
        )

        statement_data = None
        if active_statement:
            statement_data = {
                "id": active_statement.id,
                "file_name": active_statement.file_name,
                "from": active_statement.statement_from,
                "to": active_statement.statement_to,
                "uploaded_at": active_statement.uploaded_at,
            }

        # Available categories & months for this scope (unaffected by category/type filter)
        scope_qs = (
            Transaction.objects
            .filter(statement_id=active_statement.id)
            if active_statement
            else Transaction.objects.filter(statement__user=request.user)
        )

        available_categories = [
            c for c in (
                scope_qs
                .values_list("category", flat=True)
                .distinct()
                .order_by("category")
            ) if c
        ]

        available_months = [
            d.strftime("%Y-%m")
            for d in scope_qs.dates("transaction_date", "month", order="DESC")
        ]

        return paginator.get_paginated_response(
            {
                "success": True,
                "results": serializer.data,
                "statement": statement_data,
                "is_all_statements": str(statement_id).lower() == "all" if statement_id else False,
                "categories": available_categories,
                "months": available_months,
            }
        )


# ============================================================
# Transaction Detail
# ============================================================

class TransactionDetailView(APIView):

    def get(self, request, pk):

        try:

            transaction = (
                Transaction.objects
                .select_related("statement")
                .get(
                    id=pk,
                    statement__user=request.user,
                )
            )

        except Transaction.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Transaction not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "transaction": (
                    TransactionSerializer(
                        transaction
                    ).data
                ),
            }
        )


# ============================================================
# Transaction Search
# ============================================================

class TransactionSearchView(APIView):

    def get(self, request):

        search = request.query_params.get(
            "q",
            "",
        ).strip()

        if not search:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Please provide a search value."
                    ),
                    "results": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        transactions = (
            Transaction.objects
            .filter(
                statement__user=request.user
            )
            .filter(
                Q(
                    transaction_remarks__icontains=search
                )
                |
                Q(
                    cheque_number__icontains=search
                )
                |
                Q(
                    category__icontains=search
                )
            )
            .order_by(
                "-transaction_date",
                "-id",
            )
        )

        serializer = TransactionSerializer(
            transactions,
            many=True,
        )

        return Response(
            {
                "success": True,
                "count": transactions.count(),
                "results": serializer.data,
            }
        )


# ============================================================
# Category View
# ============================================================

class CategoryView(APIView):

    def get(self, request):

        statement = (
            get_latest_completed_statement(
                request
            )
        )

        if not statement:
            return Response([])

        analysis = getattr(
            statement,
            "analysis",
            None,
        )

        if not analysis:
            return Response([])

        categories = list(
            analysis.categories
            .values(
                "category",
                "total_amount",
                "transaction_count",
                "percentage",
            )
            .order_by(
                "-total_amount"
            )
        )

        return Response(
            {
                "success": True,
                "results": categories,
            }
        )


# ============================================================
# Monthly View
# ============================================================

class MonthlyView(APIView):

    def get(self, request):

        statement = (
            get_latest_completed_statement(
                request
            )
        )

        if not statement:
            return Response([])

        analysis = getattr(
            statement,
            "analysis",
            None,
        )

        if not analysis:
            return Response([])

        monthly = list(
            analysis.monthly_summaries
            .values(
                "year",
                "month",
                "month_name",
                "income",
                "expenses",
                "cash_flow",
            )
            .order_by(
                "year",
                "month",
            )
        )

        return Response(
            {
                "success": True,
                "results": monthly,
            }
        )


# ============================================================
# Insights
# ============================================================

class InsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def _resolve_statement(self, request):
        statement_id = request.query_params.get("statement_id") or request.data.get("statement_id")
        if statement_id and str(statement_id).lower() != "all":
            return BankStatement.objects.filter(
                id=statement_id,
                user=request.user,
                status="COMPLETED"
            ).first()
        return get_latest_completed_statement(request)

    def _generate_for_statement(self, statement):
        analysis = getattr(statement, "analysis", None)
        if not analysis:
            return None

        categories = list(
            analysis.categories.values("category", "total_amount", "transaction_count")
        )
        summary_payload = {
            "total_income": str(analysis.total_income or "0"),
            "total_expenses": str(analysis.total_expenses or "0"),
            "net_cash_flow": str(analysis.net_cash_flow or "0"),
            "savings_rate": str(analysis.savings_rate or "0"),
            "largest_expense": str(analysis.largest_expense or "0"),
            "categories": categories,
        }

        ai_result = generate_financial_insight(summary_payload)
        summary_text = ai_result.get("summary", "").strip()
        recommendations = ai_result.get("recommendations", [])

        if summary_text:
            analysis.ai_summary = summary_text
            analysis.ai_recommendations = recommendations
            analysis.save()

        return {
            "summary": analysis.ai_summary,
            "recommendations": analysis.ai_recommendations,
            "financial_health": ai_result.get("financial_health", "Good"),
            "key_takeaways": ai_result.get("key_takeaways", []),
            "model_used": ai_result.get("model_used", "llama3.2:latest (Local Ollama)"),
            "is_local": True,
            "statement_id": statement.id,
            "statement_file": statement.file_name,
        }

    def get(self, request):
        statement = self._resolve_statement(request)
        if not statement:
            return Response({
                "success": True,
                "has_data": False,
                "summary": "",
                "recommendations": [],
                "is_local": True,
            })

        analysis = getattr(statement, "analysis", None)
        if not analysis:
            return Response({
                "success": True,
                "has_data": False,
                "summary": "",
                "recommendations": [],
                "is_local": True,
            })

        # If summary is currently empty, automatically generate it via local Ollama
        if not analysis.ai_summary or not analysis.ai_summary.strip():
            result = self._generate_for_statement(statement)
            if result:
                return Response({
                    "success": True,
                    "has_data": True,
                    **result,
                })

        ollama_info = check_ollama_status()

        return Response({
            "success": True,
            "has_data": True,
            "summary": analysis.ai_summary,
            "recommendations": analysis.ai_recommendations,
            "is_local": True,
            "model_used": "llama3.2:latest (Local Ollama)",
            "ollama_status": ollama_info,
            "statement_id": statement.id,
            "statement_file": statement.file_name,
        })

    def post(self, request):
        statement = self._resolve_statement(request)
        if not statement:
            return Response({
                "success": False,
                "message": "No statement available to generate insights."
            }, status=status.HTTP_400_BAD_REQUEST)

        result = self._generate_for_statement(statement)
        if not result:
            return Response({
                "success": False,
                "message": "Statement analysis data not found."
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "has_data": True,
            "message": "Insights generated successfully using local Ollama model.",
            **result,
        })


# ============================================================
# Statement Summary
# ============================================================

class StatementSummaryView(APIView):

    def get(self, request, statement_id):

        statement = get_user_statement(
            request,
            statement_id,
        )

        if not statement:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Statement not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        analysis = getattr(
            statement,
            "analysis",
            None,
        )

        transactions = (
            statement.transactions.all()
        )

        # ----------------------------------------------------
        # Calculate transaction totals
        # ----------------------------------------------------

        total_withdrawal = Decimal("0.00")
        total_deposit = Decimal("0.00")

        for transaction in transactions:

            total_withdrawal += decimal_value(
                getattr(
                    transaction,
                    "withdrawal_amount",
                    0,
                )
            )

            total_deposit += decimal_value(
                getattr(
                    transaction,
                    "deposit_amount",
                    0,
                )
            )

        return Response(
            {
                "success": True,

                "statement": {
                    "id": statement.id,
                    "file_name": (
                        statement.file_name
                    ),
                    "uploaded_at": (
                        statement.uploaded_at
                    ),
                    "statement_from": (
                        statement.statement_from
                    ),
                    "statement_to": (
                        statement.statement_to
                    ),
                },

                "transactions": {
                    "count": transactions.count(),

                    "total_withdrawal": (
                        total_withdrawal
                    ),

                    "total_deposit": (
                        total_deposit
                    ),

                    "net_flow": (
                        total_deposit
                        - total_withdrawal
                    ),
                },

                "analysis": (
                    {
                        "total_income":
                            analysis.total_income,

                        "total_expenses":
                            analysis.total_expenses,

                        "net_cash_flow":
                            analysis.net_cash_flow,

                        "savings_rate":
                            analysis.savings_rate,

                        "opening_balance":
                            analysis.opening_balance,

                        "closing_balance":
                            analysis.closing_balance,
                    }
                    if analysis
                    else None
                ),
            }
        )


# ============================================================
# Delete Statement
# ============================================================

class StatementDeleteView(APIView):

    def delete(self, request, pk):

        try:

            statement = (
                BankStatement.objects
                .get(
                    id=pk,
                    user=request.user,
                )
            )

        except BankStatement.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Statement not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        statement.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Statement deleted successfully."
                ),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# Export Transactions as CSV
# ============================================================

class TransactionExportView(APIView):

    def get(self, request):

        statement_id = request.query_params.get(
            "statement_id"
        )

        transactions = (
            Transaction.objects
            .filter(
                statement__user=request.user
            )
            .order_by(
                "transaction_date",
                "id",
            )
        )

        if statement_id:

            transactions = transactions.filter(
                statement_id=statement_id
            )

        response = HttpResponse(
            content_type="text/csv"
        )

        response[
            "Content-Disposition"
        ] = (
            'attachment; '
            'filename="transactions.csv"'
        )

        import csv

        writer = csv.writer(response)

        # ----------------------------------------------------
        # Match the XLS columns
        # ----------------------------------------------------

        writer.writerow(
            [
                "S No.",
                "Value Date",
                "Transaction Date",
                "Cheque Number",
                "Transaction Remarks",
                "Withdrawal Amount(INR)",
                "Deposit Amount(INR)",
                "Balance(INR)",
                "Category",
            ]
        )

        for index, transaction in enumerate(
            transactions,
            start=1,
        ):

            writer.writerow(
                [
                    index,

                    getattr(
                        transaction,
                        "value_date",
                        "",
                    ),

                    getattr(
                        transaction,
                        "transaction_date",
                        "",
                    ),

                    getattr(
                        transaction,
                        "cheque_number",
                        "",
                    ),

                    getattr(
                        transaction,
                        "transaction_remarks",
                        "",
                    ),

                    getattr(
                        transaction,
                        "withdrawal_amount",
                        0,
                    ),

                    getattr(
                        transaction,
                        "deposit_amount",
                        0,
                    ),

                    getattr(
                        transaction,
                        "balance",
                        0,
                    ),

                    getattr(
                        transaction,
                        "category",
                        "",
                    ),
                ]
            )

        return response


# ============================================================
# Health Check
# ============================================================

class StatementHealthView(APIView):

    def get(self, request):

        statement_count = (
            BankStatement.objects
            .filter(
                user=request.user
            )
            .count()
        )

        transaction_count = (
            Transaction.objects
            .filter(
                statement__user=request.user
            )
            .count()
        )

        completed_count = (
            BankStatement.objects
            .filter(
                user=request.user,
                status="COMPLETED",
            )
            .count()
        )

        failed_count = (
            BankStatement.objects
            .filter(
                user=request.user,
                status="FAILED",
            )
            .count()
        )

        return Response(
            {
                "success": True,

                "statements": {
                    "total": statement_count,
                    "completed": completed_count,
                    "failed": failed_count,
                },

                "transactions": {
                    "total": transaction_count,
                },
            }
        )
