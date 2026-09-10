import requests
import json
import re


OLLAMA_URL = "http://localhost:11434/api/generate"

OLLAMA_MODEL = "llama3.2"


CATEGORIES = [
    "Food",
    "Travel",
    "Grocery",
    "Shopping",
    "Bills",
    "Utilities",
    "Rent",
    "EMI",
    "Investment",
    "Entertainment",
    "Healthcare",
    "Education",
    "Fuel",
    "Insurance",
    "Salary",
    "Interest",
    "Transfer",
    "ATM",
    "Cash Withdrawal",
    "Bank Charges",
    "Other",
]


def categorize_transaction(description, amount):

    prompt = f"""
You are a financial transaction categorization system.

Categorize this bank transaction.

Description:
{description}

Amount:
{amount}

Allowed categories:

{", ".join(CATEGORIES)}

Return ONLY valid JSON:

{{
    "category": "category name",
    "merchant": "merchant name",
    "confidence": 0.95,
    "reason": "short reason"
}}
"""

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        result = json.loads(
            data["response"]
        )

        category = result.get(
            "category",
            "Other"
        )

        if category not in CATEGORIES:
            category = "Other"

        return {
            "category": category,
            "merchant": result.get(
                "merchant",
                ""
            ),
            "confidence": result.get(
                "confidence",
                0
            ),
            "reason": result.get(
                "reason",
                ""
            )
        }

    except Exception as error:

        print(
            "Ollama categorization error:",
            error
        )

        return {
            "category": "Other",
            "merchant": "",
            "confidence": 0,
            "reason": "AI categorization failed"
        }


def generate_financial_insight(summary):

    prompt = f"""
You are a personal finance analysis assistant.

Analyze the following financial data.

Total Income:
{summary["total_income"]}

Total Expenses:
{summary["total_expenses"]}

Net Cash Flow:
{summary["net_cash_flow"]}

Savings Rate:
{summary["savings_rate"]}%

Largest Expense:
{summary["largest_expense"]}

Expense Categories:
{json.dumps(summary["categories"])}

Return ONLY JSON:

{{
    "summary": "short financial summary",
    "recommendations": [
        "recommendation 1",
        "recommendation 2",
        "recommendation 3"
    ]
}}
"""

    try:

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        return json.loads(
            data["response"]
        )

    except Exception as error:

        print(
            "Ollama insight error:",
            error
        )

        return {
            "summary": "Financial analysis completed.",
            "recommendations": []
        }