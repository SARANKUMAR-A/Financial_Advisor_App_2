import requests
import json
import re
from decimal import Decimal


OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_GENERATE_URL = f"{OLLAMA_BASE_URL}/api/generate"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE_URL}/api/tags"

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


def check_ollama_status():
    """
    Check if the local Ollama daemon is reachable and list installed models.
    All communication is strictly local (no internet usage).
    """
    try:
        response = requests.get(OLLAMA_TAGS_URL, timeout=3)
        if response.status_code == 200:
            models_data = response.json().get("models", [])
            model_names = [m.get("name") for m in models_data]
            return {
                "available": True,
                "models": model_names,
                "active_model": OLLAMA_MODEL,
                "is_local": True
            }
    except Exception as err:
        return {
            "available": False,
            "models": [],
            "active_model": OLLAMA_MODEL,
            "is_local": True,
            "error": str(err)
        }


def _to_serializable(val):
    """Safely convert Decimal or other non-JSON types into floats/strings."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (int, float, str, bool)):
        return val
    if isinstance(val, dict):
        return {k: _to_serializable(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [_to_serializable(item) for item in val]
    return str(val)


def categorize_transaction(description, amount):
    """Categorize a transaction using local Ollama model without external internet data sharing."""
    prompt = f"""
You are a financial transaction categorization system.

Categorize this bank transaction.
Description: {description}
Amount: {amount}

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
            OLLAMA_GENERATE_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        result = json.loads(data["response"])

        category = result.get("category", "Other")
        if category not in CATEGORIES:
            category = "Other"

        return {
            "category": category,
            "merchant": result.get("merchant", ""),
            "confidence": result.get("confidence", 0),
            "reason": result.get("reason", "")
        }

    except Exception as error:
        print("Ollama categorization error:", error)
        return {
            "category": "Other",
            "merchant": "",
            "confidence": 0,
            "reason": "AI categorization failed"
        }


def generate_financial_insight(summary, model=OLLAMA_MODEL):
    """
    Generate personalized financial advice & insights using local Ollama model.
    Runs 100% locally on localhost:11434 with zero data sent over the internet.
    """
    # Sanitize category summary so Decimals are safely converted to numbers
    raw_categories = summary.get("categories", [])
    clean_categories = []
    for cat in raw_categories:
        if isinstance(cat, dict):
            clean_categories.append({
                "category": cat.get("category", "Other"),
                "total_amount": float(cat.get("total_amount", 0) or 0),
                "transaction_count": int(cat.get("transaction_count", 0) or 0)
            })

    total_income = summary.get("total_income", "0")
    total_expenses = summary.get("total_expenses", "0")
    net_cash_flow = summary.get("net_cash_flow", "0")
    savings_rate = summary.get("savings_rate", "0")
    largest_expense = summary.get("largest_expense", "0")

    prompt = f"""You are an expert personal financial advisor analyzing Indian bank statement transactions for a user.
All monetary amounts are in Indian Rupees (₹ / INR).
Strict rule: All data is private and processed locally.

Analyze the user's financial figures:
- Total Income: ₹{total_income}
- Total Expenses: ₹{total_expenses}
- Net Cash Flow: ₹{net_cash_flow}
- Savings Rate: {savings_rate}%
- Largest Single Outflow / Expense: ₹{largest_expense}
- Top Expense Categories: {json.dumps(clean_categories)}

Provide actionable, personalized financial advice.
Return ONLY valid JSON matching this exact structure:
{{
    "summary": "2-3 clear sentences synthesizing their cash flow, savings rate, and overall financial balance in INR (₹).",
    "financial_health": "Excellent or Good or Fair or Needs Attention",
    "recommendations": [
        "First specific actionable recommendation with concrete steps",
        "Second specific actionable recommendation with spending or budget advice",
        "Third specific recommendation on savings, emergency buffer, or investments"
    ],
    "key_takeaways": [
        "Key trend or observation 1",
        "Key trend or observation 2"
    ]
}}
"""

    try:
        response = requests.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": model or OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=90
        )
        response.raise_for_status()
        data = response.json()

        result = json.loads(data["response"])
        
        # Ensure result has clean expected keys
        summary_text = result.get("summary", "").strip()
        recommendations = result.get("recommendations", [])
        if not isinstance(recommendations, list):
            recommendations = [str(recommendations)]
        
        health = result.get("financial_health", "Good")
        takeaways = result.get("key_takeaways", [])
        if not isinstance(takeaways, list):
            takeaways = []

        return {
            "summary": summary_text or "Financial analysis completed successfully.",
            "financial_health": health,
            "recommendations": recommendations,
            "key_takeaways": takeaways,
            "model_used": f"{model or OLLAMA_MODEL} (Local Ollama)",
            "is_local": True
        }

    except Exception as error:
        print("Ollama insight generation error:", error)
        # Generate clean rule-based fallback if Ollama is paused or model is downloading
        try:
            inc_val = float(total_income or 0)
            exp_val = float(total_expenses or 0)
            net_val = float(net_cash_flow or 0)
            sav_rate = float(savings_rate or 0)
        except Exception:
            inc_val, exp_val, net_val, sav_rate = 0, 0, 0, 0

        fallback_health = "Good" if net_val >= 0 and sav_rate > 20 else ("Fair" if net_val >= 0 else "Needs Attention")
        fallback_summary = (
            f"Total income recorded is ₹{inc_val:,.2f} against expenses of ₹{exp_val:,.2f}, resulting in a net cash flow of ₹{net_val:,.2f} "
            f"and a savings rate of {sav_rate:.1f}%."
        )
        fallback_recs = [
            "Review your highest spending categories and identify discretionary purchases that can be reduced.",
            "Aim to maintain an emergency reserve fund covering at least 3 to 6 months of living expenses.",
            "Target a positive monthly savings rate of at least 20% to build your wealth fund."
        ]

        return {
            "summary": fallback_summary,
            "financial_health": fallback_health,
            "recommendations": fallback_recs,
            "key_takeaways": [
                f"Net cash flow: ₹{net_val:,.2f}",
                f"Savings rate: {sav_rate:.1f}%"
            ],
            "model_used": "Offline Advisory Engine",
            "is_local": True,
            "error_note": f"Local Ollama was not responding: {str(error)}"
        }