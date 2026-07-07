"""
File processing service — ported from Invoice_app.py.

Handles:
- Auto-detecting Excel file type (flight/hotel/service) by column headers
- Persian/English digit normalization
- Jalali → Gregorian date conversion
- Processing flight, hotel, and service data into normalized line items
"""

import re
import pandas as pd
from datetime import date

from ..utils import to_english_digits, to_persian_digits, jalali_to_gregorian


# --- Column name patterns for auto-detection ---

FLIGHT_COLUMNS = {"مسیر"}
HOTEL_COLUMNS = {"هتل"}
SERVICE_COLUMNS = {"شرح خدمات", "توضیحات"}

PASSENGER_COUNT_COLUMNS = [
    "تعداد مسافر", "تعداد نفرات", "تعداد", "مسافرین", "تعداد افراد",
]

SERVICE_TYPES = ["ویزا", "اتوبوس", "قطار", "گشت", "تور", "CIP"]

MONTH_LIST = [
    "", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]


# --- Digit conversion helpers (duplicated here for service isolation) ---

def persian_to_english_number(value) -> int:
    """Convert a Persian/English digit string to int, stripping commas and non-digit chars."""
    if pd.isna(value):
        return 0
    value = str(value)
    for p, e in zip("۰۱۲۳۴۵۶۷۸۹", "0123456789"):
        value = value.replace(p, e)
    value = re.sub(r"[^\d\-]", "", value)
    return int(value) if value and value != "-" else 0


def extract_flight_date(text) -> str:
    """Extract flight date from text like 'تاریخ حرکت: 1404/03/15'."""
    if pd.isna(text):
        return ""
    match = re.search(r"تاریخ حرکت:\s*([0-9۰-۹\\/]+)", str(text))
    return match.group(1) if match else ""


def extract_hotel_dates(row) -> str:
    """Extract check-in/check-out dates from a hotel row."""
    checkin = str(row.get("تاریخ ورود", "")) if pd.notna(row.get("تاریخ ورود")) else ""
    checkout = str(row.get("تاریخ خروج", "")) if pd.notna(row.get("تاریخ خروج")) else ""
    if checkin and checkout:
        return f"ورود: {checkin}  خروج: {checkout}"
    elif checkin:
        return f"ورود: {checkin}"
    elif checkout:
        return f"خروج: {checkout}"
    return ""


# --- File type detection ---

def detect_file_type(df: pd.DataFrame) -> str:
    """Auto-detect whether an Excel DataFrame is flight, hotel, or service data."""
    cols = set(df.columns)
    if HOTEL_COLUMNS & cols:
        return "هتل"
    elif FLIGHT_COLUMNS & cols:
        return "پرواز"
    return "خدمات"


# --- Data processors ---

def process_flight_data(df: pd.DataFrame) -> list[dict]:
    """Process flight Excel data into normalized line items."""
    df = df.copy()
    df["نام مسافر"] = df["نام مسافر"].apply(
        lambda x: str(x).rstrip(", ").strip() if pd.notna(x) else x
    )
    rows = []
    for idx, (_, row) in enumerate(df.iterrows()):
        debt = persian_to_english_number(row.get("بدهکار", 0))
        credit = persian_to_english_number(row.get("بستانکار", 0))
        rows.append({
            "order": idx + 1,
            "ref": str(row.get("شماره قرارداد", "")),
            "customer_name": str(row.get("نام مسافر", "")),
            "description": str(row.get("مسیر", "")),
            "date": extract_flight_date(row.get("تاریخ پرواز", "")),
            "notes": str(row.get("شماره بلیط", "")),
            "debt": debt,
            "credit": credit,
            "balance": debt - credit,
        })
    return rows


def process_hotel_data(df: pd.DataFrame) -> list[dict]:
    """Process hotel Excel data into normalized line items."""
    df = df.copy()
    df["نام مسافر"] = df["نام مسافر"].apply(
        lambda x: str(x).strip() if pd.notna(x) else x
    )

    # Auto-detect passenger count column
    passenger_count_col = None
    for col in df.columns:
        if col.strip() in PASSENGER_COUNT_COLUMNS:
            passenger_count_col = col
            break
    if not passenger_count_col:
        for col in df.columns:
            col_lower = col.strip()
            if ("تعداد" in col_lower or "نفرات" in col_lower or "مسافر" in col_lower) and "نام" not in col_lower:
                passenger_count_col = col
                break

    if passenger_count_col:
        df["تعداد نفرات"] = df[passenger_count_col].apply(
            lambda x: max(1, persian_to_english_number(x)) if pd.notna(x) else 1
        )
    else:
        df["تعداد نفرات"] = 1

    rows = []
    for idx, (_, row) in enumerate(df.iterrows()):
        debt = persian_to_english_number(row.get("بدهکار", 0))
        credit = persian_to_english_number(row.get("بستانکار", 0))
        pax = int(row.get("تعداد نفرات", 1))
        hotel_name = str(row.get("هتل", ""))
        room_type = str(row.get("اتاق", ""))
        description = f"{hotel_name} - {room_type}" if room_type else hotel_name
        notes = f"تعداد نفرات: {pax}" if pax > 1 else ""
        rows.append({
            "order": idx + 1,
            "ref": str(row.get("شماره قرارداد", "")),
            "customer_name": str(row.get("نام مسافر", "")),
            "description": description,
            "date": extract_hotel_dates(row),
            "notes": notes,
            "debt": debt,
            "credit": credit,
            "balance": debt - credit,
        })
    return rows


def process_service_data(df: pd.DataFrame) -> list[dict]:
    """Process service Excel data into normalized line items."""
    df = df.copy()
    df["نام مسافر"] = df["نام مسافر"].apply(
        lambda x: str(x).rstrip(", ").strip() if pd.notna(x) else x
    )
    rows = []
    for idx, (_, row) in enumerate(df.iterrows()):
        debt = persian_to_english_number(row.get("بدهکار", 0))
        credit = persian_to_english_number(row.get("بستانکار", 0))
        svc_type = str(row.get("شرح خدمات", ""))
        date_val = str(row.get("تاریخ", "")) if pd.notna(row.get("تاریخ")) else ""
        notes = str(row.get("توضیحات", "")) if pd.notna(row.get("توضیحات")) else ""
        rows.append({
            "order": idx + 1,
            "ref": str(row.get("شماره قرارداد", "")),
            "customer_name": str(row.get("نام مسافر", "")),
            "description": svc_type,
            "date": date_val,
            "notes": notes,
            "debt": debt,
            "credit": credit,
            "balance": debt - credit,
        })
    return rows


def process_excel_file(file_obj, file_type: str | None = None) -> dict:
    """
    Main entry point: read an Excel file, detect type, process data.
    
    Returns:
        {
            "file_type": "flight" | "hotel" | "service",
            "rows": [line item dicts],
            "summary": { "total_debt": int, "total_credit": int, "total_balance": int, "row_count": int }
        }
    """
    df = pd.read_excel(file_obj)

    # Validate required columns
    if "نام مسافر" not in df.columns:
        raise ValueError("ستون 'نام مسافر' یافت نشد. فایل باید شامل این ستون باشد.")
    if "بدهکار" not in df.columns or "بستانکار" not in df.columns:
        raise ValueError("ستون‌های 'بدهکار' و 'بستانکار' الزامی هستند.")

    # Detect or use provided file type
    detected_type = file_type or detect_file_type(df)

    if detected_type == "پرواز":
        rows = process_flight_data(df)
    elif detected_type == "هتل":
        rows = process_hotel_data(df)
    else:
        rows = process_service_data(df)

    total_debt = sum(r["debt"] for r in rows)
    total_credit = sum(r["credit"] for r in rows)

    return {
        "file_type": detected_type,
        "rows": rows,
        "summary": {
            "total_debt": total_debt,
            "total_credit": total_credit,
            "total_balance": total_debt - total_credit,
            "row_count": len(rows),
        },
    }
