"""
Finance file services API views.

Handles:
- Excel file import (upload → detect → process → preview → confirm create invoices)
- Document generation (generate Excel/Word/HTML from invoice data)
- File download (serve generated files as temporary downloads)
- Template management (get/save active HTML invoice template)
"""

import logging
from datetime import date

from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import (
    Payer, ItemType, Invoice, LineItem, LetterSequence, ApprovalRequest, GeneratedFile,
)
from ..permissions import finance_permission, get_user_company
from ..utils import today_jalali
from ..services.file_processing import process_excel_file, detect_file_type
from ..services.file_generation import (
    generate_invoice_excel,
    generate_declaration_word,
    generate_invoice_preview_html,
)

logger = logging.getLogger(__name__)


def _company(user):
    return get_user_company(user)


# ============================================================
# 1. EXCEL IMPORT ENDPOINTS
# ============================================================

@api_view(['POST'])
@finance_permission('can_issue')
def import_excel_preview(request):
    """
    Upload an Excel file and get a preview of processed data.
    Does NOT create invoices yet — just returns the processed rows.
    
    POST multipart: file, file_type (optional)
    """
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'error': 'فایل ارسال نشد'}, status=status.HTTP_400_BAD_REQUEST)

    file_type = request.data.get('file_type')  # optional override: flight/hotel/service

    try:
        result = process_excel_file(file_obj, file_type=file_type)
        return Response({
            'file_type': result['file_type'],
            'rows': result['rows'],
            'summary': result['summary'],
        })
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Excel import error: {e}", exc_info=True)
        return Response({'error': f'خطا در پردازش فایل: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@finance_permission('can_issue')
def import_excel_confirm(request):
    """
    Confirm and create invoices from previewed data.
    
    POST JSON: {
        "payer_id": int,
        "item_type_id": int,
        "issue_date": "YYYY-MM-DD",
        "period_range": "۱ تا ۱۵ خرداد ۱۴۰۴",
        "file_type": "flight" | "hotel" | "service",
        "rows": [... line item dicts from preview ...]
    }
    """
    company = _company(request.user)
    
    payer_id = request.data.get('payer_id')
    item_type_id = request.data.get('item_type_id')
    issue_date = request.data.get('issue_date')
    period_range = request.data.get('period_range', '')
    file_type = request.data.get('file_type', 'service')
    rows = request.data.get('rows', [])

    if not payer_id or not item_type_id or not rows:
        return Response({'error': 'payer_id, item_type_id و rows الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payer = Payer.objects.get(pk=payer_id, company=company)
        item_type = ItemType.objects.get(pk=item_type_id, company=company)
    except (Payer.DoesNotExist, ItemType.DoesNotExist):
        return Response({'error': 'پرداختکننده یا نوع آیتم یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    # Auto-generate letter number
    jy, _, _ = today_jalali()
    year_2digit = str(jy)[-2:]
    letter_number = LetterSequence.reserve_next(company, payer, year_2digit)

    # Determine invoice_type from ItemType
    with transaction.atomic():
        invoice = Invoice.objects.create(
            company=company,
            payer=payer,
            invoice_type=item_type,
            letter_number=letter_number,
            issue_date=issue_date or date.today(),
            period_range=period_range,
            status='draft',
            created_by=request.user,
        )

        total_debt = 0
        for i, row in enumerate(rows):
            debt = int(row.get('debt', 0))
            credit = int(row.get('credit', 0))
            total_debt += debt
            LineItem.objects.create(
                invoice=invoice,
                item_type=item_type,
                ref=row.get('ref', ''),
                customer_name=row.get('customer_name', ''),
                description=row.get('description', ''),
                date=row.get('date', ''),
                notes=row.get('notes', ''),
                debt=debt,
                credit=credit,
                order=i + 1,
            )

        invoice.amount = total_debt
        invoice.save(update_fields=['amount'])

    return Response({
        'id': invoice.id,
        'letter_number': invoice.letter_number,
        'status': invoice.status,
        'amount': invoice.amount,
        'line_count': len(rows),
    }, status=status.HTTP_201_CREATED)


# ============================================================
# 2. DOCUMENT GENERATION ENDPOINTS
# ============================================================

@api_view(['GET'])
@finance_permission('can_view_finance')
def generate_invoice_files(request, pk):
    """
    Generate document files for an invoice on-the-fly.
    Returns URLs/info for downloading Excel, Word, and HTML preview.
    
    GET /invoices/invoices/{pk}/generate/
    """
    company = _company(request.user)
    try:
        invoice = Invoice.objects.select_related('payer', 'invoice_type', 'company').prefetch_related('items').get(pk=pk, company=company)
    except Invoice.DoesNotExist:
        return Response({'error': 'صورتحساب یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    # Load company settings (bank accounts, etc.)
    company_settings = {
        'company_name': getattr(company, 'name', ''),
        'national_id': getattr(company, 'national_id', ''),
        'economic_code': getattr(company, 'economic_code', ''),
        'address': getattr(company, 'address', ''),
        'postal_code': getattr(company, 'postal_code', ''),
        'phone': getattr(company, 'phone', ''),
        'bank_name1': getattr(company, 'bank_name1', ''),
        'account_number1': getattr(company, 'account_number1', ''),
        'shaba_number1': getattr(company, 'shaba_number1', ''),
        'bank_name2': getattr(company, 'bank_name2', ''),
        'account_number2': getattr(company, 'account_number2', ''),
        'shaba_number2': getattr(company, 'shaba_number2', ''),
        'manager_name': getattr(company, 'manager_name', ''),
        'manager_position': getattr(company, 'manager_position', ''),
    }

    rows = []
    for item in invoice.items.all().order_by('order'):
        rows.append({
            'ref': item.ref,
            'customer_name': item.customer_name,
            'description': item.description,
            'date': item.date,
            'notes': item.notes,
            'debt': item.debt,
            'credit': item.credit,
            'balance': item.balance,
        })

    format_type = request.query_params.get('format', 'all')
    result = {}

    if format_type in ('excel', 'all'):
        excel_bytes = generate_invoice_excel(rows, invoice.payer.name, invoice.letter_number)
        result['excel'] = {
            'filename': f"صورتحساب {invoice.payer.name} {invoice.letter_number}.xlsx",
            'size': len(excel_bytes.getvalue()),
        }

    if format_type in ('word', 'all'):
        total_debt = sum(r['debt'] for r in rows)
        total_credit = sum(r['credit'] for r in rows)
        is_creditor = (total_debt - total_credit) < 0
        word_bytes = generate_declaration_word(
            payer_name=invoice.payer.name,
            letter_number=invoice.letter_number,
            letter_date=str(invoice.issue_date),
            service_type=invoice.invoice_type.name,
            period_range=invoice.period_range,
            total_amount=abs(total_debt - total_credit),
            company_settings=company_settings,
            is_creditor=is_creditor,
        )
        result['word'] = {
            'filename': f"اعلامیه {invoice.payer.name} {invoice.letter_number}.docx",
            'size': len(word_bytes.getvalue()),
        }

    if format_type in ('html', 'all'):
        total_debt = sum(r['debt'] for r in rows)
        total_credit = sum(r['credit'] for r in rows)
        total_balance = total_debt - total_credit
        html_content = generate_invoice_preview_html(
            rows=rows,
            seller=company_settings,
            buyer={
                'name': invoice.payer.name,
                'national_id': invoice.payer.national_id,
                'economic_code': invoice.payer.economic_code,
                'address': invoice.payer.address,
                'postal_code': invoice.payer.postal_code,
                'phone': invoice.payer.phone,
            },
            service_type=invoice.invoice_type.name,
            invoice_number=invoice.letter_number,
            invoice_date=str(invoice.issue_date),
            total_debt=total_debt,
            total_credit=total_credit,
            total_balance=total_balance,
        )
        result['html'] = html_content

    return Response(result)


@api_view(['GET'])
@finance_permission('can_view_finance')
def download_invoice_file(request, pk, fmt):
    """
    Download a generated file for an invoice.
    
    GET /invoices/invoices/{pk}/download/{fmt}/
    fmt: excel, word
    """
    company = _company(request.user)
        try:
            invoice = Invoice.objects.select_related('payer', 'invoice_type', 'company').prefetch_related('items').get(pk=pk, company=company)
        except Invoice.DoesNotExist:
            return Response({'error': 'صورتحساب یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        rows = []
        for item in invoice.items.all().order_by('order'):
            rows.append({
                'ref': item.ref, 'customer_name': item.customer_name,
                'description': item.description, 'date': item.date,
                'notes': item.notes, 'debt': item.debt, 'credit': item.credit,
                'balance': item.balance,
            })

        if fmt == 'excel':
            output = generate_invoice_excel(rows, invoice.payer.name, invoice.letter_number)
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ext = 'xlsx'
        elif fmt == 'word':
            total_debt = sum(r['debt'] for r in rows)
            total_credit = sum(r['credit'] for r in rows)
            is_creditor = (total_debt - total_credit) < 0
            output = generate_declaration_word(
                payer_name=invoice.payer.name,
                letter_number=invoice.letter_number,
                letter_date=str(invoice.issue_date),
                service_type=invoice.invoice_type.name,
                period_range=invoice.period_range,
                total_amount=abs(total_debt - total_credit),
                company_settings={},
                is_creditor=is_creditor,
            )
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ext = 'docx'
        else:
            return Response({'error': 'فرمت نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)

        file_bytes = output.getvalue()

    filename = f"invoice_{pk}.{ext}"
    response = HttpResponse(file_bytes, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ============================================================
# 3. TEMPLATE MANAGEMENT ENDPOINTS
# ============================================================

# In-memory template store (will be moved to DB when templates_app is ready)
_active_template = {'html': '', 'css': '', 'settings': {}}


@api_view(['GET'])
@finance_permission('can_view_finance')
def get_active_template(request):
    """Get the active invoice HTML template."""
    # Try DB first (via templates_app if it exists)
    try:
        from apps.templates_app.models import ReportTemplate
        template = ReportTemplate.objects.filter(is_default=True).first()
        if template:
            return Response({
                'html': template.template_json.get('html', '') if isinstance(template.template_json, dict) else '',
                'css': template.template_json.get('css', '') if isinstance(template.template_json, dict) else '',
                'settings': template.template_json.get('settings', {}) if isinstance(template.template_json, dict) else {},
            })
    except (ImportError, Exception):
        pass
    # Fallback to in-memory
    return Response(_active_template)


@api_view(['POST'])
@finance_permission('can_manage_settings')
def save_active_template(request):
    """Save the active invoice HTML template."""
    html = request.data.get('html', '')
    css = request.data.get('css', '')
    settings = request.data.get('settings', {})

    try:
        from apps.templates_app.models import ReportTemplate
        # Deactivate old default, create new
        ReportTemplate.objects.filter(is_default=True).update(is_default=False)
        ReportTemplate.objects.create(
            name='قالب اصلی',
            description='قالب سفارشی کاربر',
            doc_kind='invoice',
            template_json={'html': html, 'css': css, 'settings': settings},
            is_default=True,
            updated_by=request.user,
        )
    except (ImportError, Exception):
        global _active_template
        _active_template = {'html': html, 'css': css, 'settings': settings}

    return Response({'status': 'ok'})


# ============================================================
# 4. LETTER NUMBER MANAGEMENT ENDPOINTS
# ============================================================

@api_view(['POST'])
@finance_permission('can_submit')
def reserve_letter_number(request):
    """Reserve the next letter number for a payer."""
    company = _company(request.user)
    payer_id = request.data.get('payer_id')
    if not payer_id:
        return Response({'error': 'payer_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payer = Payer.objects.get(pk=payer_id, company=company)
    except Payer.DoesNotExist:
        return Response({'error': 'پرداختکننده یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    jy, _, _ = today_jalali()
    year_2digit = str(jy)[-2:]
    letter_number = LetterSequence.reserve_next(company, payer, year_2digit)

    return Response({'letter_number': letter_number})


# ============================================================
# 5. PAYER BALANCE ENDPOINT
# ============================================================

@api_view(['GET'])
@finance_permission('can_view_finance')
def payer_balance_detail(request, pk):
    """Get detailed balance breakdown for a payer."""
    company = _company(request.user)
    try:
        payer = Payer.objects.get(pk=pk, company=company)
    except Payer.DoesNotExist:
        return Response({'error': 'پرداختکننده یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    from ..models import Payment, ManualDebt, Credit

    invoices_total = sum(inv.amount for inv in Invoice.objects.filter(company=company, payer=payer))
    payments_total = sum(p.amount for p in Payment.objects.filter(company=company, payer=payer))
    debts_total = sum(d.amount for d in ManualDebt.objects.filter(company=company, payer=payer))
    credits_total = sum(c.amount for c in Credit.objects.filter(company=company, payer=payer))

    return Response({
        'payer': {'id': payer.id, 'name': payer.name, 'code': payer.code},
        'invoices_total': invoices_total,
        'payments_total': payments_total,
        'manual_debts_total': debts_total,
        'credits_total': credits_total,
        'balance': invoices_total + debts_total - payments_total - credits_total,
    })



