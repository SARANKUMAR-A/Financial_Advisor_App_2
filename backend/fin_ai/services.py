import os
import re

import pandas as pd

from decimal import Decimal, InvalidOperation

from django.db.models import Sum, Count
from django.db.models.functions import ExtractYear, ExtractMonth

from .models import (
    BankStatement,
    Transaction,
    FinancialAnalysis,
    CategorySummary,
    MonthlySummary,
)

from .ollama_service import (
    categorize_transaction,
    generate_financial_insight,
)


# ============================================================
# AMOUNT CLEANING
# ============================================================

def clean_amount(value):
    """
    Convert Excel amount values into Decimal.

    Handles:
    - 1234.50
    - "1,234.50"
    - "₹1,234.50"
    - "-"
    - ""
    - NaN
    - None
    """

    if value is None:
        return Decimal("0")

    try:
        if pd.isna(value):
            return Decimal("0")
    except Exception:
        pass

    if isinstance(value, Decimal):
        return value

    if isinstance(value, (int, float)):
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal("0")

    value = str(value).strip()

    if not value:
        return Decimal("0")

    value = (
        value
        .replace("₹", "")
        .replace(",", "")
        .replace(" ", "")
        .replace("\u00a0", "")
        .strip()
    )

    if value in [
        "",
        "-",
        "--",
        "NA",
        "N/A",
        "nan",
        "None",
    ]:
        return Decimal("0")

    # Handle brackets as negative numbers
    if value.startswith("(") and value.endswith(")"):
        value = "-" + value[1:-1]

    try:
        return Decimal(value)

    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ):
        return Decimal("0")


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(value):
    """
    Safely convert an Excel/AI value to string.

    None, NaN and empty values become an empty string.
    """

    if value is None:
        return ""

    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass

    return str(value).strip()


# ============================================================
# COLUMN NORMALIZATION
# ============================================================

def normalize_column_name(column):
    """
    Normalize Excel column names.

    Examples:
        S No.                         -> s_no
        Value Date                    -> value_date
        Transaction Date              -> transaction_date
        Transaction Remarks          -> transaction_remarks
        Withdrawal Amount(INR)       -> withdrawal_amount_inr
        Deposit Amount(INR)          -> deposit_amount_inr
        Balance(INR)                 -> balance_inr
    """

    if column is None:
        return ""

    column = str(column).strip()

    # Normalize spaces
    column = re.sub(r"\s+", " ", column)

    # Remove currency/parentheses formatting
    column = column.replace("₹", "")
    column = column.replace("(INR)", " INR")
    column = column.replace("( INR )", " INR")
    column = column.replace("( INR)", " INR")
    column = column.replace("(INR )", " INR")

    # Lowercase
    column = column.lower()

    # Replace non-alphanumeric characters
    column = re.sub(
        r"[^a-z0-9]+",
        "_",
        column,
    )

    # Remove duplicate underscores
    column = re.sub(
        r"_+",
        "_",
        column,
    )

    return column.strip("_")


# ============================================================
# FIND COLUMN
# ============================================================

def find_column(df, possible_names):
    """
    Find a column using multiple possible names.

    Works with normalized column names.
    """

    normalized = {
        normalize_column_name(column): column
        for column in df.columns
    }

    normalized_possible_names = [
        normalize_column_name(name)
        for name in possible_names
    ]

    # Exact matching
    for name in normalized_possible_names:
        if name in normalized:
            return normalized[name]

    # Partial matching
    for normalized_column, original_column in normalized.items():
        for possible_name in normalized_possible_names:
            if (
                possible_name in normalized_column
                or normalized_column in possible_name
            ):
                return original_column

    return None


# ============================================================
# FIND ICICI TRANSACTION HEADER
# ============================================================

def find_transaction_header_row(raw_df):
    """
    Find the actual ICICI transaction header row.

    Expected header:

    S No.
    Value Date
    Transaction Date
    Cheque Number
    Transaction Remarks
    Withdrawal Amount(INR)
    Deposit Amount(INR)
    Balance(INR)
    """

    for index in range(len(raw_df)):

        row = raw_df.iloc[index]

        values = [
            normalize_column_name(value)
            for value in row.tolist()
        ]

        values = [
            value
            for value in values
            if value
        ]

        row_text = " | ".join(values)

        print(
            f"Checking Excel row {index}: {row_text}"
        )

        has_transaction_date = (
            "transaction_date" in values
        )

        has_value_date = (
            "value_date" in values
        )

        has_transaction_remarks = (
            "transaction_remarks" in values
        )

        has_withdrawal = any(
            value in [
                "withdrawal_amount_inr",
                "withdrawal_amount",
                "withdrawal",
            ]
            for value in values
        )

        has_deposit = any(
            value in [
                "deposit_amount_inr",
                "deposit_amount",
                "deposit",
            ]
            for value in values
        )

        has_balance = any(
            value in [
                "balance_inr",
                "balance",
            ]
            for value in values
        )

        if (
            (
                has_transaction_date
                or has_value_date
            )
            and has_transaction_remarks
            and has_withdrawal
            and has_deposit
            and has_balance
        ):

            print(
                f"ICICI transaction header found at row {index}"
            )

            return index

    return None


# ============================================================
# READ EXCEL FILE
# ============================================================

def read_excel_file(file_path):
    """
    Read both old .xls and modern .xlsx files.
    """

    extension = os.path.splitext(
        str(file_path)
    )[1].lower()

    if extension == ".xls":

        try:
            return pd.read_excel(
                file_path,
                header=None,
                engine="xlrd",
            )

        except ImportError as error:

            raise ImportError(
                "The uploaded file is an XLS file. "
                "Install xlrd >= 2.0.1 using:\n\n"
                "python -m pip install xlrd==2.0.2"
            ) from error

    elif extension == ".xlsx":

        return pd.read_excel(
            file_path,
            header=None,
            engine="openpyxl",
        )

    else:

        raise ValueError(
            "Unsupported file format. "
            "Please upload an .xls or .xlsx file."
        )


# ============================================================
# PARSE DATE
# ============================================================

def parse_transaction_date(value):
    """
    Convert Excel date value to Python date.
    """

    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:

        parsed = pd.to_datetime(
            value,
            errors="coerce",
            dayfirst=True,
        )

        if pd.isna(parsed):
            return None

        return parsed.date()

    except Exception:
        return None


# ============================================================
# EXTRACT ACCOUNT DETAILS
# ============================================================

def extract_account_details(raw_df):
    """
    Extract account information from ICICI metadata rows.

    Example:

    809401501513 ( INR ) - SARANKUMAR ANPALAGAN
    """

    account_number = None
    account_holder = None

    for _, row in raw_df.iterrows():

        for value in row.tolist():

            text = clean_text(value)

            if not text:
                continue

            account_match = re.search(
                r"(\d{8,20})\s*\(\s*INR\s*\)",
                text,
                flags=re.IGNORECASE,
            )

            if account_match:

                account_number = (
                    account_match.group(1)
                )

                remaining = re.sub(
                    r"\d{8,20}\s*\(\s*INR\s*\)\s*-?\s*",
                    "",
                    text,
                    flags=re.IGNORECASE,
                ).strip()

                if remaining:
                    account_holder = remaining

                return {
                    "account_number": account_number,
                    "account_holder": account_holder,
                }

    return {
        "account_number": account_number,
        "account_holder": account_holder,
    }


# ============================================================
# EXTRACT STATEMENT RANGE
# ============================================================

def extract_statement_range(raw_df):
    """
    Extract statement date range from ICICI metadata.

    Example:

    01/09/2026
    to
    09/09/2026
    """

    dates = []

    for _, row in raw_df.iterrows():

        for value in row.tolist():

            text = clean_text(value)

            if not text:
                continue

            found_dates = re.findall(
                r"\b\d{1,2}/\d{1,2}/\d{4}\b",
                text,
            )

            for date_text in found_dates:

                parsed = parse_transaction_date(
                    date_text
                )

                if parsed:
                    dates.append(parsed)

    if len(dates) >= 2:
        return (
            min(dates),
            max(dates),
        )

    return None, None


# ============================================================
# PREPARE ICICI DATAFRAME
# ============================================================

def prepare_icici_dataframe(file_path):

    print(
        "Reading Excel file:",
        file_path,
    )

    raw_df = read_excel_file(
        file_path
    )

    print(
        "Raw Excel shape:",
        raw_df.shape,
    )

    # Remove completely empty rows
    raw_df = raw_df.dropna(
        how="all"
    ).reset_index(
        drop=True
    )

    if raw_df.empty:
        raise ValueError(
            "The uploaded Excel file is empty."
        )

    # --------------------------------------------------------
    # Find transaction header
    # --------------------------------------------------------

    header_row = find_transaction_header_row(
        raw_df
    )

    if header_row is None:

        print(
            "Unable to find transaction header."
        )

        for index in range(
            min(30, len(raw_df))
        ):

            print(
                f"ROW {index}:",
                raw_df.iloc[index].tolist(),
            )

        raise ValueError(
            "Could not find the ICICI transaction header. "
            "Expected 'Transaction Date', "
            "'Transaction Remarks', "
            "'Withdrawal Amount(INR)', "
            "'Deposit Amount(INR)' and "
            "'Balance(INR)'."
        )

    print(
        "Transaction header row:",
        header_row,
    )

    header_values = raw_df.iloc[
        header_row
    ].tolist()

    print(
        "Excel headers:",
        header_values,
    )

    # Data starts after header
    data_df = raw_df.iloc[
        header_row + 1:
    ].copy()

    # Assign normalized headers
    data_df.columns = [
        normalize_column_name(column)
        for column in header_values
    ]

    # Remove empty columns
    data_df = data_df.dropna(
        axis=1,
        how="all",
    )

    # Remove duplicate columns
    data_df = data_df.loc[
        :,
        ~data_df.columns.duplicated(),
    ]

    print(
        "Normalized headers:",
        list(data_df.columns),
    )

    # --------------------------------------------------------
    # Locate columns
    # --------------------------------------------------------

    date_column = find_column(
        data_df,
        [
            "transaction_date",
            "transaction_date_",
            "date",
        ],
    )

    value_date_column = find_column(
        data_df,
        [
            "value_date",
        ],
    )

    serial_column = find_column(
        data_df,
        [
            "s_no",
            "sno",
            "serial_number",
        ],
    )

    cheque_column = find_column(
        data_df,
        [
            "cheque_number",
            "cheque_no",
            "cheque",
        ],
    )

    description_column = find_column(
        data_df,
        [
            "transaction_remarks",
            "transaction_remark",
            "remarks",
            "description",
        ],
    )

    debit_column = find_column(
        data_df,
        [
            "withdrawal_amount_inr",
            "withdrawal_amount",
            "withdrawal",
            "debit",
        ],
    )

    credit_column = find_column(
        data_df,
        [
            "deposit_amount_inr",
            "deposit_amount",
            "deposit",
            "credit",
        ],
    )

    balance_column = find_column(
        data_df,
        [
            "balance_inr",
            "balance",
        ],
    )

    print("Detected columns:")
    print("date_column:", date_column)
    print("value_date_column:", value_date_column)
    print("serial_column:", serial_column)
    print("cheque_column:", cheque_column)
    print("description_column:", description_column)
    print("debit_column:", debit_column)
    print("credit_column:", credit_column)
    print("balance_column:", balance_column)

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    if not date_column:
        raise ValueError(
            "Transaction Date column not found "
            "in the uploaded XLS. "
            f"Available columns: {list(data_df.columns)}"
        )

    if not description_column:
        raise ValueError(
            "Transaction Remarks column not found "
            "in the uploaded XLS. "
            f"Available columns: {list(data_df.columns)}"
        )

    if not debit_column and not credit_column:
        raise ValueError(
            "Withdrawal/Deposit columns not found. "
            f"Available columns: {list(data_df.columns)}"
        )

    if not balance_column:
        raise ValueError(
            "Balance column not found. "
            f"Available columns: {list(data_df.columns)}"
        )

    # --------------------------------------------------------
    # Rename to internal standard names
    # --------------------------------------------------------

    rename_map = {
        date_column: "transaction_date",
        description_column: "description",
    }

    if value_date_column:
        rename_map[value_date_column] = "value_date"

    if serial_column:
        rename_map[serial_column] = "serial_number"

    if cheque_column:
        rename_map[cheque_column] = "cheque_number"

    if debit_column:
        rename_map[debit_column] = "debit"

    if credit_column:
        rename_map[credit_column] = "credit"

    if balance_column:
        rename_map[balance_column] = "balance"

    data_df = data_df.rename(
        columns=rename_map
    )

    # --------------------------------------------------------
    # Remove legends section
    # --------------------------------------------------------

    valid_indexes = []

    for index, row in data_df.iterrows():

        row_text = " ".join(
            clean_text(value)
            for value in row.tolist()
        ).lower()

        if (
            "legends used in account statement"
            in row_text
        ):
            break

        valid_indexes.append(index)

    data_df = data_df.loc[
        valid_indexes
    ].copy()

    # --------------------------------------------------------
    # Clean transactions
    # --------------------------------------------------------

    cleaned_rows = []

    for _, row in data_df.iterrows():

        transaction_date = parse_transaction_date(
            row.get("transaction_date")
        )

        value_date = parse_transaction_date(
            row.get("value_date")
        )

        description = clean_text(
            row.get("description")
        )

        serial_number = clean_text(
            row.get("serial_number")
        )

        cheque_number = clean_text(
            row.get("cheque_number")
        )

        debit = clean_amount(
            row.get("debit", 0)
        )

        credit = clean_amount(
            row.get("credit", 0)
        )

        balance = clean_amount(
            row.get("balance", 0)
        )

        # ----------------------------------------------------
        # ICICI wrapped remark row
        # ----------------------------------------------------

        is_continuation = (
            transaction_date is None
            and not serial_number
            and description
            and debit == 0
            and credit == 0
            and balance == 0
        )

        if is_continuation:

            if cleaned_rows:

                cleaned_rows[-1]["description"] = (
                    cleaned_rows[-1]["description"]
                    + " "
                    + description
                ).strip()

            continue

        # Ignore invalid rows
        if transaction_date is None:
            continue

        cleaned_rows.append(
            {
                "serial_number": serial_number,
                "value_date": value_date,
                "transaction_date": transaction_date,
                "cheque_number": cheque_number,
                "description": description,
                "debit": debit,
                "credit": credit,
                "balance": balance,
            }
        )

    if not cleaned_rows:
        raise ValueError(
            "No valid transactions were found "
            "in the uploaded XLS."
        )

    result_df = pd.DataFrame(
        cleaned_rows
    )

    print(
        "Successfully parsed transactions:",
        len(result_df),
    )

    return result_df


# ============================================================
# MERCHANT EXTRACTION
# ============================================================

def extract_merchant_name(description):
    """
    Extract a readable merchant name from ICICI UPI remarks.

    Examples:

        UPI/Burger Kin/burgerking.bdp/Payment fr/...
        -> Burger Kin

        UPI/Green Plus/Vyapar.1767727/Medicine/...
        -> Green Plus

        UPI/Airtel/...
        -> Airtel
    """

    text = clean_text(description)

    if not text:
        return "Unknown Merchant"

    parts = [
        part.strip()
        for part in text.split("/")
        if part and part.strip()
    ]

    if not parts:
        return "Unknown Merchant"

    # Remove UPI prefix
    if parts[0].upper() in [
        "UPI",
        "IMPS",
        "NEFT",
        "RTGS",
    ]:
        parts = parts[1:]

    if not parts:
        return "Unknown Merchant"

    merchant = parts[0].strip()

    invalid_merchants = {
        "payment",
        "payment fr",
        "payment for",
        "upi",
        "web upi",
        "unknown",
        "unknown transaction",
        "transfer",
        "fund transfer",
    }

    if merchant.lower() in invalid_merchants:
        return "Unknown Merchant"

    # Remove unwanted technical prefixes
    merchant = re.sub(
        r"^(mr|mrs|ms|dr)\.?\s+",
        "",
        merchant,
        flags=re.IGNORECASE,
    )

    return merchant.title()


# ============================================================
# RULE-BASED CATEGORY DETECTION
# ============================================================

def get_rule_based_category(
    description,
    transaction_type="DEBIT",
):
    """
    Categorize transactions using deterministic rules.

    This function is based on the transaction descriptions
    commonly present in the uploaded ICICI XLS.

    Rule-based categorization is executed before Ollama.
    """

    text = clean_text(description).lower()
    transaction_type = clean_text(
        transaction_type
    ).upper()

    if not text:
        return None

    # Normalize separators and repeated spaces
    normalized_text = re.sub(
        r"[^a-z0-9]+",
        " ",
        text,
    )

    normalized_text = re.sub(
        r"\s+",
        " ",
        normalized_text,
    ).strip()

    # --------------------------------------------------------
    # CREDIT TRANSACTIONS
    # --------------------------------------------------------

    if transaction_type == "CREDIT":

        if any(
            keyword in normalized_text
            for keyword in [
                "salary",
                "salary credit",
                "sal credit",
                "payroll",
                "stipend",
                "income",
            ]
        ):
            return "Income"

        if any(
            keyword in normalized_text
            for keyword in [
                "refund",
                "cashback",
                "cash back",
                "reversal",
                "reverted",
            ]
        ):
            return "Refunds & Cashback"

        return "Personal Transfers"

    # --------------------------------------------------------
    # RENT / HOUSING
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "rent",
            "house rent",
            "home rent",
            "rental",
        ]
    ):
        return "Rent & Housing"

    # --------------------------------------------------------
    # LOAN / EMI
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "loan",
            "emi",
            "loan repayment",
            "loan payment",
            "repayment",
        ]
    ):
        return "Loan & EMI"

    # --------------------------------------------------------
    # BILLS / RECHARGE / TELECOM
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "airtel",
            "jio recharge",
            "jio",
            "mobile recharge",
            "recharge",
            "broadband",
            "internet bill",
            "electricity",
            "electricity bill",
            "water bill",
            "gas bill",
            "bill payment",
            "bbps",
            "bpay",
            "phone bill",
            "telephone",
        ]
    ):
        return "Bills & Recharge"

    # --------------------------------------------------------
    # TRANSPORTATION
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "petrol",
            "diesel",
            "fuel",
            "hindustan petro",
            "hindustan petroleum",
            "hpcl",
            "bharat petroleum",
            "indian oil",
            "shell petrol",
            "cmrl",
            "chennai metro",
            "metro rail",
            "metro",
            "indian railway",
            "indian rai",
            "railway",
            "train",
            "uber",
            "ola",
            "rapido",
            "bus",
            "parking",
            "toll",
            "transport",
        ]
    ):
        return "Transportation"

    # --------------------------------------------------------
    # HEALTHCARE / MEDICAL
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "medicine",
            "medical",
            "pharmacy",
            "chemist",
            "hospital",
            "doctor",
            "clinic",
            "healthcare",
            "health",
            "green plus",
            "medical shop",
            "apollo pharmacy",
            "medplus",
        ]
    ):
        return "Healthcare"

    # --------------------------------------------------------
    # GROCERIES / DAILY ESSENTIALS
    # Based on descriptions such as:
    # Milk, Curd, Grocery, Chicken, Fruits, Water, Mavvu
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "grocery",
            "groceries",
            "milk",
            "curd",
            "chicken",
            "mutton",
            "fish",
            "meat",
            "fruits",
            "fruit",
            "vegetable",
            "vegetables",
            "tender coconut",
            "tender coc",
            "mavvu",
            "flour",
            "rice",
            "dal",
            "pulses",
            "oil",
            "bread",
            "egg",
            "eggs",
            "provision",
            "provisions",
            "daily needs",
            "supermarket",
            "water",
        ]
    ):
        return "Groceries"

    # --------------------------------------------------------
    # FOOD / DINING
    # Based on descriptions such as:
    # Tea, Waffle, Lunch, Dinner, Snacks, Puff, Cake,
    # Burger King, Dominos, Laddu, Pori, etc.
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "tea",
            "coffee",
            "waffle",
            "lunch",
            "dinner",
            "breakfast",
            "snack",
            "snacks",
            "puff",
            "cake",
            "burger",
            "burger king",
            "dominos",
            "domino",
            "pizza",
            "restaurant",
            "hotel",
            "food",
            "laddu",
            "ladoo",
            "pori",
            "bajji",
            "samosa",
            "parotta",
            "biryani",
            "juice",
            "sweet",
            "bakery",
            "canteen",
            "mess",
            "tiffin",
            "dosa",
            "idli",
            "chapati",
            "meals",
        ]
    ):
        return "Food & Dining"

    # --------------------------------------------------------
    # ENTERTAINMENT
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "pvr",
            "inox",
            "cinema",
            "movie",
            "ags cinema",
            "theatre",
            "theater",
            "netflix",
            "prime video",
            "hotstar",
            "spotify",
            "youtube premium",
            "entertainment",
        ]
    ):
        return "Entertainment"

    # --------------------------------------------------------
    # SPORTS / RECREATION
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "cricket",
            "badminton",
            "football",
            "sports",
            "gym",
            "fitness",
            "game",
            "stadium",
            "sports shop",
        ]
    ):
        return "Sports & Recreation"

    # --------------------------------------------------------
    # EDUCATION / OFFICE
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "xerox",
            "print",
            "printing",
            "stationery",
            "book",
            "books",
            "school",
            "college",
            "course",
            "education",
            "exam",
            "office",
            "photocopy",
        ]
    ):
        return "Education & Office"

    # --------------------------------------------------------
    # PERSONAL CARE / SHOPPING
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "clips",
            "fancy",
            "cosmetics",
            "salon",
            "parlour",
            "parlor",
            "beauty",
            "haircut",
            "personal care",
            "dress",
            "clothing",
            "shirt",
            "pant",
            "shoe",
            "footwear",
            "bag",
            "watch",
            "accessories",
        ]
    ):
        return "Personal Care & Shopping"

    # --------------------------------------------------------
    # HOUSEHOLD / HOME MAINTENANCE
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "cocks",
            "tap",
            "plumbing",
            "hardware",
            "washing powder",
            "detergent",
            "cleaning",
            "soap",
            "household",
            "home maintenance",
            "cleaning powder",
            "bucket",
            "broom",
            "mop",
            "thoranam",
            "ilai",
        ]
    ):
        return "Household"

    # --------------------------------------------------------
    # SHOPPING / RETAIL
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "reliance retail",
            "relianceretail",
            "jio store",
            "amazon",
            "flipkart",
            "myntra",
            "shopping",
            "retail",
            "mall",
            "store",
            "mart",
            "market",
        ]
    ):
        return "Shopping"

    # --------------------------------------------------------
    # FLOWERS / POOJA / RELIGIOUS ITEMS
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "flower",
            "flowers",
            "pooja",
            "puja",
            "vilakku",
            "malai",
            "garland",
            "thoranam",
            "ilai",
            "temple",
            "religious",
        ]
    ):
        return "Religious & Personal"

    # --------------------------------------------------------
    # GENERIC UPI PAYMENT
    #
    # Descriptions such as "Payment fr" do not contain enough
    # merchant information. They are treated as personal
    # transfers instead of incorrectly forcing everything
    # into Other.
    # --------------------------------------------------------

    if any(
        keyword in normalized_text
        for keyword in [
            "payment fr",
            "payment for",
            "payment",
            "upi",
            "fund transfer",
            "transfer to",
            "sent to",
        ]
    ):
        return "Personal Transfers"

    return None


# ============================================================
# SAFE AI CATEGORIZATION WITH RULE-BASED OVERRIDE
# ============================================================

def get_ai_category(
    description,
    amount,
    transaction_type="DEBIT",
):
    """
    Categorize transactions using:

    1. Deterministic rules for known XLS descriptions.
    2. Ollama AI fallback for unknown descriptions.
    """

    description = clean_text(
        description
    )

    # --------------------------------------------------------
    # STEP 1: Rule-based categorization
    # --------------------------------------------------------

    rule_based_category = get_rule_based_category(
        description=description,
        transaction_type=transaction_type,
    )

    if rule_based_category:

        print(
            "Rule-based category:",
            rule_based_category,
            "| Description:",
            description,
        )

        return {
            "category": rule_based_category,
            "merchant": extract_merchant_name(
                description
            ),
            "confidence": 1.0,
            "reason": (
                "Categorized using transaction "
                "description rules."
            ),
        }

    # --------------------------------------------------------
    # STEP 2: Ollama fallback
    # --------------------------------------------------------

    try:

        result = categorize_transaction(
            description,
            amount,
        )

        if not isinstance(result, dict):
            raise ValueError(
                "Invalid AI response."
            )

        # ----------------------------------------------------
        # CATEGORY
        # ----------------------------------------------------

        category = clean_text(
            result.get("category")
        )

        if not category:
            category = "Other"

        # Normalize common AI category variations
        category_aliases = {
            "food": "Food & Dining",
            "dining": "Food & Dining",
            "groceries": "Groceries",
            "grocery": "Groceries",
            "medical": "Healthcare",
            "health": "Healthcare",
            "transport": "Transportation",
            "travel": "Transportation",
            "shopping": "Shopping",
            "entertainment": "Entertainment",
            "rent": "Rent & Housing",
            "loan": "Loan & EMI",
            "emi": "Loan & EMI",
            "bills": "Bills & Recharge",
            "recharge": "Bills & Recharge",
            "other": "Other",
            "others": "Other",
        }

        category_key = category.lower().strip()

        if category_key in category_aliases:
            category = category_aliases[
                category_key
            ]

        # ----------------------------------------------------
        # MERCHANT
        # ----------------------------------------------------

        merchant = clean_text(
            result.get("merchant")
        )

        if not merchant:
            merchant = extract_merchant_name(
                description
            )

        if not merchant:
            merchant = "Unknown Merchant"

        # ----------------------------------------------------
        # CONFIDENCE
        # ----------------------------------------------------

        confidence = result.get(
            "confidence",
            0,
        )

        try:
            confidence = float(
                confidence
            )
        except (
            ValueError,
            TypeError,
        ):
            confidence = 0

        confidence = max(
            0,
            min(
                confidence,
                1,
            ),
        )

        # ----------------------------------------------------
        # REASON
        # ----------------------------------------------------

        reason = clean_text(
            result.get("reason")
        )

        if not reason:
            reason = (
                "Categorized using AI analysis."
            )

        return {
            "category": category,
            "merchant": merchant,
            "confidence": confidence,
            "reason": reason,
        }

    except Exception as error:

        print(
            "AI categorization failed:",
            error,
        )

        return {
            "category": "Other",
            "merchant": (
                extract_merchant_name(
                    description
                )
                or "Unknown Merchant"
            ),
            "confidence": 0,
            "reason": (
                "AI categorization failed; "
                "fallback category used."
            ),
        }


# ============================================================
# PROCESS STATEMENT
# ============================================================

def process_statement(statement):

    statement.status = "PROCESSING"

    statement.save(
        update_fields=[
            "status",
        ]
    )

    try:

        # ----------------------------------------------------
        # Delete previous transactions if statement is
        # being reprocessed
        # ----------------------------------------------------

        Transaction.objects.filter(
            statement=statement
        ).delete()

        # ----------------------------------------------------
        # File path
        # ----------------------------------------------------

        file_path = statement.original_file.path

        if not os.path.exists(
            file_path
        ):

            raise FileNotFoundError(
                f"Uploaded file not found: {file_path}"
            )

        # ----------------------------------------------------
        # Prepare ICICI transaction dataframe
        # ----------------------------------------------------

        df = prepare_icici_dataframe(
            file_path
        )

        # ----------------------------------------------------
        # Extract account details
        # ----------------------------------------------------

        raw_df = read_excel_file(
            file_path
        )

        account_details = (
            extract_account_details(
                raw_df
            )
        )

        print(
            "Account Number:",
            account_details.get(
                "account_number"
            ),
        )

        print(
            "Account Holder:",
            account_details.get(
                "account_holder"
            ),
        )

        # ----------------------------------------------------
        # Extract statement date range
        # ----------------------------------------------------

        extracted_from, extracted_to = (
            extract_statement_range(
                raw_df
            )
        )

        created_transactions = []

        # ----------------------------------------------------
        # Process every transaction
        # ----------------------------------------------------

        for row_number, (_, row) in enumerate(
            df.iterrows(),
            start=1,
        ):

            transaction_date = (
                row["transaction_date"]
            )

            value_date = (
                row.get("value_date")
            )

            description = clean_text(
                row.get("description")
            )

            if not description:
                description = "Unknown Transaction"

            debit = clean_amount(
                row.get("debit", 0)
            )

            credit = clean_amount(
                row.get("credit", 0)
            )

            balance = clean_amount(
                row.get("balance", 0)
            )

            cheque_number = clean_text(
                row.get("cheque_number")
            )

            # ------------------------------------------------
            # Determine transaction type
            # ------------------------------------------------

            if credit > 0:
                transaction_type = "CREDIT"

            elif debit > 0:
                transaction_type = "DEBIT"

            else:
                transaction_type = "DEBIT"

            # ------------------------------------------------
            # Amount for categorization
            # ------------------------------------------------

            transaction_amount = (
                credit
                if credit > 0
                else debit
            )

            # ------------------------------------------------
            # Categorization
            # ------------------------------------------------

            ai_result = get_ai_category(
                description=description,
                amount=transaction_amount,
                transaction_type=transaction_type,
            )

            if not isinstance(
                ai_result,
                dict,
            ):
                ai_result = {}

            # ------------------------------------------------
            # Final safety normalization
            # ------------------------------------------------

            category = clean_text(
                ai_result.get("category")
            )

            if not category:
                category = "Other"

            merchant = clean_text(
                ai_result.get("merchant")
            )

            if not merchant:
                merchant = (
                    extract_merchant_name(
                        description
                    )
                    or "Unknown Merchant"
                )

            confidence = ai_result.get(
                "confidence",
                0,
            )

            if confidence is None:
                confidence = 0

            try:
                confidence = float(
                    confidence
                )
            except (
                ValueError,
                TypeError,
            ):
                confidence = 0

            confidence = max(
                0,
                min(
                    confidence,
                    1,
                ),
            )

            reason = clean_text(
                ai_result.get("reason")
            )

            if not reason:
                reason = (
                    "No categorization reason available."
                )

            # ------------------------------------------------
            # Debug transaction
            # ------------------------------------------------

            print(
                "----------------------------------------------"
            )

            print(
                "Processing transaction:",
                row_number,
            )

            print(
                "Date:",
                transaction_date,
            )

            print(
                "Description:",
                description,
            )

            print(
                "Debit:",
                debit,
            )

            print(
                "Credit:",
                credit,
            )

            print(
                "Transaction Type:",
                transaction_type,
            )

            print(
                "Category:",
                category,
            )

            print(
                "Merchant:",
                merchant,
            )

            print(
                "Confidence:",
                confidence,
            )

            # ------------------------------------------------
            # Create transaction
            # ------------------------------------------------

            transaction_obj = Transaction(
                statement=statement,
                transaction_date=transaction_date,
                description=description,
                debit=debit,
                credit=credit,
                balance=balance,
                transaction_type=transaction_type,
                category=category,
                merchant=merchant,
                ai_confidence=confidence,
                ai_reason=reason,
            )

            # ------------------------------------------------
            # Add optional model fields
            # ------------------------------------------------

            if hasattr(
                transaction_obj,
                "value_date",
            ):
                transaction_obj.value_date = (
                    value_date
                )

            if hasattr(
                transaction_obj,
                "cheque_number",
            ):
                transaction_obj.cheque_number = (
                    cheque_number
                )

            if hasattr(
                transaction_obj,
                "transaction_remarks",
            ):
                transaction_obj.transaction_remarks = (
                    description
                )

            created_transactions.append(
                transaction_obj
            )

        # ----------------------------------------------------
        # Final validation before bulk insert
        # ----------------------------------------------------

        for transaction in created_transactions:

            if not transaction.category:
                transaction.category = "Other"

            if not transaction.merchant:
                transaction.merchant = (
                    "Unknown Merchant"
                )

            if transaction.ai_confidence is None:
                transaction.ai_confidence = 0

            if not transaction.ai_reason:
                transaction.ai_reason = (
                    "No categorization reason available."
                )

        print(
            "=============================================="
        )

        print(
            "Prepared transactions:",
            len(created_transactions),
        )

        print(
            "Starting Transaction bulk insert..."
        )

        # ----------------------------------------------------
        # Bulk insert
        # ----------------------------------------------------

        Transaction.objects.bulk_create(
            created_transactions,
            batch_size=500,
        )

        print(
            "Transaction bulk insert completed."
        )

        # ----------------------------------------------------
        # Statement totals
        # ----------------------------------------------------

        statement.total_transactions = len(
            created_transactions
        )

        if created_transactions:

            transaction_dates = [
                transaction.transaction_date
                for transaction in created_transactions
                if transaction.transaction_date
            ]

            if transaction_dates:

                statement.statement_from = (
                    extracted_from
                    or min(transaction_dates)
                )

                statement.statement_to = (
                    extracted_to
                    or max(transaction_dates)
                )

        # ----------------------------------------------------
        # Save statement
        # ----------------------------------------------------

        statement.save()

        # ----------------------------------------------------
        # Calculate financial analysis
        # ----------------------------------------------------

        analysis = calculate_analysis(
            statement
        )

        # ----------------------------------------------------
        # Mark completed
        # ----------------------------------------------------

        statement.status = "COMPLETED"

        statement.error_message = ""

        statement.save(
            update_fields=[
                "status",
                "error_message",
            ]
        )

        print(
            "=============================================="
        )

        print(
            "STATEMENT PROCESSING COMPLETED"
        )

        print(
            "Statement ID:",
            statement.id,
        )

        print(
            "Total Transactions:",
            statement.total_transactions,
        )

        print(
            "=============================================="
        )

        return analysis

    except Exception as error:

        print(
            "Statement processing failed:",
            error,
        )

        statement.status = "FAILED"

        statement.error_message = str(
            error
        )

        statement.save(
            update_fields=[
                "status",
                "error_message",
            ]
        )

        raise


# ============================================================
# FINANCIAL ANALYSIS
# ============================================================

def calculate_analysis(statement):

    transactions = (
        statement
        .transactions
        .all()
    )

    total_income = (
        transactions.aggregate(
            total=Sum("credit")
        )["total"]
        or Decimal("0")
    )

    total_expenses = (
        transactions.aggregate(
            total=Sum("debit")
        )["total"]
        or Decimal("0")
    )

    net_cash_flow = (
        total_income
        - total_expenses
    )

    transaction_count = (
        transactions.count()
    )

    # --------------------------------------------------------
    # Largest expense
    # --------------------------------------------------------

    largest_expense_transaction = (
        transactions
        .filter(debit__gt=0)
        .order_by("-debit")
        .first()
    )

    largest_expense = (
        largest_expense_transaction.debit
        if largest_expense_transaction
        else Decimal("0")
    )

    # --------------------------------------------------------
    # Largest income
    # --------------------------------------------------------

    largest_income_transaction = (
        transactions
        .filter(credit__gt=0)
        .order_by("-credit")
        .first()
    )

    largest_income = (
        largest_income_transaction.credit
        if largest_income_transaction
        else Decimal("0")
    )

    # --------------------------------------------------------
    # Savings rate
    # --------------------------------------------------------

    if total_income > 0:

        savings_rate = (
            net_cash_flow
            / total_income
        ) * 100

    else:

        savings_rate = Decimal("0")

    # --------------------------------------------------------
    # Monthly count
    # --------------------------------------------------------

    monthly_count = (
        transactions
        .dates(
            "transaction_date",
            "month",
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

    # --------------------------------------------------------
    # Opening balance
    # --------------------------------------------------------

    first_transaction = (
        transactions
        .order_by(
            "transaction_date",
            "id",
        )
        .first()
    )

    # --------------------------------------------------------
    # Closing balance
    # --------------------------------------------------------

    last_transaction = (
        transactions
        .order_by(
            "-transaction_date",
            "-id",
        )
        .first()
    )

    # --------------------------------------------------------
    # FinancialAnalysis
    # --------------------------------------------------------

    analysis, _ = (
        FinancialAnalysis.objects
        .update_or_create(
            statement=statement,
            defaults={
                "total_income": total_income,

                "total_expenses": total_expenses,

                "net_cash_flow": net_cash_flow,

                "average_monthly_income": (
                    average_monthly_income
                ),

                "average_monthly_expense": (
                    average_monthly_expense
                ),

                "largest_expense": (
                    largest_expense
                ),

                "largest_income": (
                    largest_income
                ),

                "savings_rate": (
                    savings_rate
                ),

                "opening_balance": (
                    first_transaction.balance
                    if first_transaction
                    else None
                ),

                "closing_balance": (
                    last_transaction.balance
                    if last_transaction
                    else None
                ),
            },
        )
    )

    # --------------------------------------------------------
    # Category summaries
    # --------------------------------------------------------

    create_category_summaries(
        analysis
    )

    # --------------------------------------------------------
    # Monthly summaries
    # --------------------------------------------------------

    create_monthly_summaries(
        analysis
    )

    # --------------------------------------------------------
    # Categories for AI insight
    # --------------------------------------------------------

    categories = list(
        CategorySummary.objects
        .filter(
            analysis=analysis
        )
        .values(
            "category",
            "total_amount",
            "transaction_count",
        )
    )

    # --------------------------------------------------------
    # AI financial insight
    # --------------------------------------------------------

    try:

        ai_result = generate_financial_insight(
            {
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

                "categories": categories,
            }
        )

        if not isinstance(
            ai_result,
            dict,
        ):
            ai_result = {}

    except Exception as error:

        print(
            "Financial insight generation failed:",
            error,
        )

        ai_result = {}

    analysis.ai_summary = clean_text(
        ai_result.get(
            "summary",
            "",
        )
    )

    recommendations = ai_result.get(
        "recommendations",
        [],
    )

    if not isinstance(
        recommendations,
        list,
    ):
        recommendations = []

    analysis.ai_recommendations = (
        recommendations
    )

    analysis.save()

    return analysis


# ============================================================
# CATEGORY SUMMARIES
# ============================================================

def create_category_summaries(
    analysis,
):

    CategorySummary.objects.filter(
        analysis=analysis
    ).delete()

    transactions = (
        analysis
        .statement
        .transactions
        .filter(
            debit__gt=0
        )
    )

    total_expenses = (
        transactions.aggregate(
            total=Sum("debit")
        )["total"]
        or Decimal("0")
    )

    grouped = (
        transactions
        .values("category")
        .annotate(
            total_amount=Sum("debit"),
            transaction_count=Count("id"),
        )
        .order_by("-total_amount")
    )

    objects = []

    for item in grouped:

        amount = (
            item["total_amount"]
            or Decimal("0")
        )

        if total_expenses > 0:

            percentage = (
                amount
                / total_expenses
            ) * 100

        else:

            percentage = Decimal("0")

        category_name = clean_text(
            item.get("category")
        )

        if not category_name:
            category_name = "Other"

        objects.append(
            CategorySummary(
                analysis=analysis,

                category=category_name,

                total_amount=amount,

                transaction_count=(
                    item["transaction_count"]
                ),

                percentage=percentage,
            )
        )

    if objects:

        CategorySummary.objects.bulk_create(
            objects
        )


# ============================================================
# MONTHLY SUMMARIES
# ============================================================

def create_monthly_summaries(
    analysis,
):

    MonthlySummary.objects.filter(
        analysis=analysis
    ).delete()

    transactions = (
        analysis
        .statement
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
            ),
        )
        .values(
            "year",
            "month",
        )
        .annotate(
            income=Sum("credit"),
            expenses=Sum("debit"),
        )
        .order_by(
            "year",
            "month",
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
        "December",
    ]

    objects = []

    for item in grouped:

        income = (
            item["income"]
            or Decimal("0")
        )

        expenses = (
            item["expenses"]
            or Decimal("0")
        )

        month = item["month"]
        year = item["year"]

        if (
            month
            and 1 <= month <= 12
        ):

            month_name = (
                month_names[month]
            )

        else:

            month_name = ""

        objects.append(
            MonthlySummary(
                analysis=analysis,

                year=year,

                month=month,

                month_name=month_name,

                income=income,

                expenses=expenses,

                cash_flow=(
                    income - expenses
                ),
            )
        )

    if objects:

        MonthlySummary.objects.bulk_create(
            objects
        )