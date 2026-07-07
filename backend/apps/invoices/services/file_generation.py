"""
File generation service — ported from final_file_service.py.

Generates Excel and Word files on-the-fly from invoice/approval data.
PDF generation uses an HTML template rendered to PDF via a headless browser or
can be delegated to an external service.

All files are generated temporarily and served directly — they are NOT stored
permanently. Data is pulled from the database at generation time.
"""

import io
import os
import re
import logging
import tempfile
from datetime import date

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

from ..utils import to_persian_digits, today_jalali

logger = logging.getLogger(__name__)


def _persian_number_filter(value):
    """Format a number with Persian digits and thousand separators."""
    try:
        if value is None:
            return "۰"
        return to_persian_digits(f"{int(value):,}")
    except (ValueError, TypeError):
        return to_persian_digits(f"{value:,}") if value else "۰"


def _safe_filename(text: str) -> str:
    """Sanitize a string for use as a filename."""
    text = str(text).strip()
    if not text:
        text = "بدون_نام"
    text = re.sub(r'[\\/*?:"<>|]', '-', text)
    return text


# --- Excel Generation ---

def generate_invoice_excel(rows: list[dict], payer_name: str, letter_number: str) -> io.BytesIO:
    """
    Generate an Excel file for an invoice line items table.
    
    Args:
        rows: list of dicts with keys: ref, customer_name, description, date, notes, debt, credit, balance
        payer_name: name of the payer/customer
        letter_number: the letter number
    
    Returns:
        io.BytesIO with the Excel file bytes
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "صورتحساب"

    # Styles
    header_font = Font(name="B Nazanin", size=11, bold=True)
    header_fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
    data_font = Font(name="B Nazanin", size=10)
    border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    data_alignment = Alignment(horizontal="center", vertical="center")
    rtl_alignment = Alignment(horizontal="right", vertical="center")

    # Headers (RTL order)
    headers = ["ردیف", "شماره قرارداد", "نام مسافر", "شرح خدمات", "تاریخ", "توضیحات", "بدهکار (ریال)", "بستانکار (ریال)", "مانده (ریال)"]
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = border
        cell.alignment = header_alignment

    # Data rows
    for row_idx, row_data in enumerate(rows, 2):
        values = [
            row_idx - 1,
            row_data.get("ref", ""),
            row_data.get("customer_name", ""),
            row_data.get("description", ""),
            row_data.get("date", ""),
            row_data.get("notes", ""),
            row_data.get("debt", 0),
            row_data.get("credit", 0),
            row_data.get("balance", 0),
        ]
        for col_idx, value in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = data_font
            cell.border = border
            if col_idx <= 6:
                cell.alignment = rtl_alignment
            else:
                cell.alignment = data_alignment
                # Format large numbers
                if isinstance(value, (int, float)) and col_idx >= 7:
                    cell.number_format = '#,##0'

    # Totals row
    total_row = len(rows) + 2
    total_debt = sum(r.get("debt", 0) for r in rows)
    total_credit = sum(r.get("credit", 0) for r in rows)
    total_balance = total_debt - total_credit

    ws.cell(row=total_row, column=6, value="جمع").font = Font(name="B Nazanin", size=10, bold=True)
    ws.cell(row=total_row, column=6).border = border
    ws.cell(row=total_row, column=6).alignment = rtl_alignment

    for col_idx, value in [(7, total_debt), (8, total_credit), (9, total_balance)]:
        cell = ws.cell(row=total_row, column=col_idx, value=value)
        cell.font = Font(name="B Nazanin", size=10, bold=True)
        cell.border = border
        cell.alignment = data_alignment
        cell.number_format = '#,##0'

    # Auto-fit columns
    for col_idx in range(1, 10):
        max_length = max(
            len(str(ws.cell(row=r, column=col_idx).value or ""))
            for r in range(1, total_row + 1)
        )
        ws.column_dimensions[get_column_letter(col_idx)].width = max(max_length * 1.5, 10)

    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# --- Word Generation (simple declaration letter) ---

def generate_declaration_word(
    payer_name: str,
    letter_number: str,
    letter_date: str,
    service_type: str,
    period_range: str,
    total_amount: int,
    company_settings: dict,
    is_creditor: bool = False,
) -> io.BytesIO:
    """
    Generate a Word declaration letter (.docx) for an invoice.
    
    Returns io.BytesIO with the Word file bytes.
    Falls back to a simple text-based Word doc if docxtpl is not available.
    """
    try:
        from docx import Document
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        # If python-docx is not installed, return a minimal placeholder
        output = io.BytesIO()
        output.write(b"Document generation requires python-docx package")
        output.seek(0)
        return output

    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'B Nazanin'
    style.font.size = Pt(16)

    # Helper to add RTL paragraph
    def add_para(text, bold=False, alignment=WD_ALIGN_PARAGRAPH.RIGHT):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.bold = bold
        p.alignment = alignment
        return p

    add_para(f"تاریخ: {letter_date}")
    add_para(f"شماره: {letter_number}")
    add_para(f"شرکت محترم {payer_name}", bold=True)

    if is_creditor:
        add_para(
            f"احتراماً، بدین وسیله اعلام می‌دارد که بابت خدمات {service_type} "
            f"ارائه شده در بازه {period_range}، مبلغ {_persian_number_filter(total_amount)} "
            f"ریال بستانکار این شرکت می‌باشد."
        )
        add_para("خواهشمند است نسبت به صدور فاکتور رسمی به نام این شرکت اقدام فرمایید.")
    else:
        add_para(
            f"احتراما بدین وسیله صورت حساب مربوط به {period_range}"
        )
        add_para(f"بابت {service_type} به مبلغ {_persian_number_filter(total_amount)} ریال")
        add_para("جهت اطلاع و انجام اقدامات لازم به پیوست ایفاد می‌گردد.")
        add_para("خواهشمند است دستور فرمائید مبلغ مربوطه به حساب این شرکت واریز شود.")

    add_para("مشخصات حساب بانکی شرکت به شرح زیر است:")
    bank1 = company_settings.get("bank_name1", "")
    acct1 = company_settings.get("account_number1", "")
    shaba1 = company_settings.get("shaba_number1", "")
    bank2 = company_settings.get("bank_name2", "")
    acct2 = company_settings.get("account_number2", "")
    shaba2 = company_settings.get("shaba_number2", "")
    if bank1:
        add_para(f"بانک {bank1} - شماره حساب {acct1} - شبا {shaba1}")
    if bank2:
        add_para(f"بانک {bank2} - شماره حساب {acct2} - شبا {shaba2}")

    company_name = company_settings.get("company_name", "")
    if company_name:
        add_para(f"نام صاحب حساب: {company_name}")

    manager_name = company_settings.get("manager_name", "")
    manager_position = company_settings.get("manager_position", "")
    if manager_name:
        add_para(manager_name)
    if manager_position:
        add_para(manager_position)

    add_para(
        "برابر قانون و با توجه به ماهیت کار آژانس (ارائه خدمات واسطه‌ای) "
        "برای هریک از خدمات ارائه شده، صورتحساب به نام و کد ملی مسافر صادر و به سامانه مودیان ارسال می‌گردد.",
        bold=True,
    )

    output = io.BytesIO()
    doc.save(output)
    output.seek(0)
    return output


# --- Invoice Preview HTML (for template-based PDF generation) ---

def generate_invoice_preview_html(
    rows: list[dict],
    seller: dict,
    buyer: dict,
    service_type: str,
    invoice_number: str,
    invoice_date: str,
    total_debt: int = 0,
    total_credit: int = 0,
    total_balance: int = 0,
    template_html: str = "",
    template_css: str = "",
    is_last: bool = True,
) -> str:
    """
    Generate an HTML preview of an invoice using a template.
    This can be converted to PDF via a headless browser.
    """
    if not template_html:
        template_html = """
        <div class="invoice-header">صورتحساب {{ service_type }} شماره: {{ invoice_number }} تاریخ: {{ invoice_date }}</div>
        <div class="box-title">مشخصات فروشنده</div>
        <table class="seller-box">
            <tr><td class="label">شناسه ملی:</td><td>{{ seller.national_id }}</td></tr>
            <tr><td class="label">نام شخص حقوقی:</td><td>{{ seller.company_name }}</td></tr>
            <tr><td class="label">نشانی:</td><td>{{ seller.address }}</td></tr>
        </table>
        <div class="box-title">مشخصات خریدار</div>
        <table class="buyer-box">
            <tr><td class="label">شناسه ملی:</td><td>{{ buyer.national_id }}</td></tr>
            <tr><td class="label">نام شخص حقوقی:</td><td>{{ buyer.name }}</td></tr>
        </table>
        <table class="data-table">
            <thead><tr><th>ردیف</th><th>شرح خدمات</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead>
            <tbody>
            {% for row in rows %}
            <tr>
                <td>{{ loop.index }}</td>
                <td>{{ row.description }}</td>
                <td>{{ row.debt }}</td>
                <td>{{ row.credit }}</td>
                <td>{{ row.balance }}</td>
            </tr>
            {% endfor %}
            </tbody>
        </table>
        <div class="totals-row">
            <div>جمع بدهکار: {{ total_debt }} ریال</div>
            <div>جمع بستانکار: {{ total_credit }} ریال</div>
            <div>مانده: {{ total_balance }} ریال</div>
        </div>
        """

    if not template_css:
        template_css = """
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: 'B Nazanin', Tahoma, Arial, sans-serif; font-size: 9px; }
        .invoice-header { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .box-title { font-weight: bold; text-align: center; background-color: #e0e0e0; padding: 3px; margin: 3px 0; }
        .seller-box, .buyer-box { border: 1px solid #000; border-collapse: collapse; width: 100%; margin-bottom: 6px; }
        .seller-box td, .buyer-box td { border: 1px solid #000; padding: 4px; }
        .seller-box .label, .buyer-box .label { font-weight: bold; background-color: #f0f0f0; width: 25%; }
        .data-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 8px 0; }
        .data-table th, .data-table td { border: 1px solid #000; padding: 3px; text-align: center; }
        .data-table th { background-color: #f0f0f0; font-weight: bold; }
        .totals-row { margin-top: 6px; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 4px; }
        """

    try:
        from jinja2 import Template
        rendered = Template(template_html).render(
            rows=rows,
            seller=seller,
            buyer=buyer,
            service_type=service_type,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            total_debt=_persian_number_filter(total_debt),
            total_credit=_persian_number_filter(total_credit),
            total_balance=_persian_number_filter(total_balance),
        )
    except Exception:
        # Fallback: simple HTML
        row_html = ""
        for i, r in enumerate(rows, 1):
            row_html += f"<tr><td>{i}</td><td>{r.get('description','')}</td><td>{_persian_number_filter(r.get('debt',0))}</td><td>{_persian_number_filter(r.get('credit',0))}</td><td>{_persian_number_filter(r.get('balance',0))}</td></tr>"
        rendered = f"""
        <h2>صورتحساب {service_type} - شماره {invoice_number}</h2>
        <p>فروشنده: {seller.get('company_name','')} | خریدار: {buyer.get('name','')}</p>
        <table border="1" cellpadding="4" style="width:100%;border-collapse:collapse;text-align:center;">
        <thead><tr><th>ردیف</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead>
        <tbody>{row_html}</tbody>
        </table>
        <p>جمع بدهکار: {_persian_number_filter(total_debt)} | جمع بستانکار: {_persian_number_filter(total_credit)} | مانده: {_persian_number_filter(total_balance)}</p>
        """

    return f"""<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head><meta charset="UTF-8"><style>{template_css}</style></head>
<body>{rendered}</body>
</html>"""
