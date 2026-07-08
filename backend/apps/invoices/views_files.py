"""
Finance file services API views.

Handles:
- Excel file import (upload → detect → process → preview → confirm create invoices)
- Document generation (generate Excel/Word/HTML from invoice data)
- File download (serve generated files as temporary downloads)
- Template management (get/save active HTML invoice template)
"""

import io
import logging
import os
from datetime import date

from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    Payer, ItemType, Invoice, LineItem, LetterSequence, ApprovalRequest, GeneratedFile,
    FileTemplate, Payment, ManualDebt, Credit,
)
from .permissions import finance_permission, get_user_company
from .utils import today_jalali
from .services.file_processing import process_excel_file, detect_file_type
from .services.file_generation import (
    generate_invoice_excel,
    generate_declaration_word,
    generate_invoice_preview_html,
    generate_invoice_pdf,
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

    # Load company settings
    company_settings = {
        'company_name': getattr(company, 'name', ''),
        'national_id': getattr(company, 'national_id', ''),
        'economic_code': getattr(company, 'economic_code', ''),
        'address': getattr(company, 'address', ''),
        'bank_name1': getattr(company, 'bank_name1', ''),
        'account_number1': getattr(company, 'account_number1', ''),
        'shaba_number1': getattr(company, 'shaba_number1', ''),
        'bank_name2': getattr(company, 'bank_name2', ''),
        'account_number2': getattr(company, 'account_number2', ''),
        'shaba_number2': getattr(company, 'shaba_number2', ''),
        'manager_name': getattr(company, 'manager_name', ''),
        'manager_position': getattr(company, 'manager_position', ''),
    }

    total_debt = sum(r['debt'] for r in rows)
    total_credit = sum(r['credit'] for r in rows)
    is_creditor = (total_debt - total_credit) < 0

    if fmt == 'excel':
        output = generate_invoice_excel(rows, invoice.payer.name, invoice.letter_number)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ext = 'xlsx'
    elif fmt == 'word':
        output = generate_declaration_word(
            payer_name=invoice.payer.name,
            letter_number=invoice.letter_number,
            letter_date=str(invoice.issue_date),
            service_type=invoice.invoice_type.name,
            period_range=invoice.period_range,
            total_amount=abs(total_debt - total_credit),
            company_settings=company_settings,
            is_creditor=is_creditor,
        )
        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ext = 'docx'
    elif fmt == 'pdf':
        # Generate HTML first, then convert to PDF
        buyer = {
            'name': invoice.payer.name,
            'national_id': invoice.payer.national_id,
            'economic_code': invoice.payer.economic_code,
            'address': invoice.payer.address,
            'postal_code': invoice.payer.postal_code,
            'phone': invoice.payer.phone,
        }
        html_content = generate_invoice_preview_html(
            rows=rows, seller=company_settings, buyer=buyer,
            service_type=invoice.invoice_type.name,
            invoice_number=invoice.letter_number,
            invoice_date=str(invoice.issue_date),
            total_debt=total_debt, total_credit=total_credit,
            total_balance=total_debt - total_credit,
        )
        output = generate_invoice_pdf(html_content)
        content_type = 'application/pdf'
        ext = 'pdf'
    else:
        return Response({'error': 'فرمت نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)

    file_bytes = output.getvalue()
    filename = f"invoice_{invoice.letter_number}.{ext}"
    response = HttpResponse(file_bytes, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ============================================================
# 3. FILE TEMPLATE MANAGEMENT (DOCX upload + placeholder substitution)
# ============================================================

@api_view(['GET', 'POST'])
@finance_permission('can_manage_settings')
def file_template_list_create(request):
    """List or create DOCX/HTML file templates for document generation."""
    company = _company(request.user)
    if request.method == 'GET':
        doc_kind = request.query_params.get('doc_kind')
        qs = FileTemplate.objects.filter(company=company)
        if doc_kind:
            qs = qs.filter(doc_kind=doc_kind)
        data = []
        for t in qs:
            data.append({
                'id': t.id, 'name': t.name, 'doc_kind': t.doc_kind,
                'description': t.description, 'placeholders': t.placeholders,
                'is_active': t.is_active, 'is_default': t.is_default,
                'version': t.version, 'has_template_file': bool(t.template_file),
                'has_html': bool(t.html_content),
                'created_at': str(t.created_at), 'updated_at': str(t.updated_at),
            })
        return Response(data)
    # POST
    name = request.data.get('name', '')
    doc_kind = request.data.get('doc_kind', 'invoice')
    description = request.data.get('description', '')
    tmpl = FileTemplate.objects.create(
        company=company, name=name, doc_kind=doc_kind,
        description=description, updated_by=request.user,
    )
    # Handle file upload
    if 'template_file' in request.FILES:
        tmpl.template_file = request.FILES['template_file']
        tmpl.placeholders = _extract_docx_placeholders(tmpl.template_file)
        tmpl.save()
    return Response({'id': tmpl.id, 'name': tmpl.name}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_manage_settings')
def file_template_detail(request, pk):
    """Get, update, or delete a file template."""
    company = _company(request.user)
    try:
        tmpl = FileTemplate.objects.get(pk=pk, company=company)
    except FileTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response({
            'id': tmpl.id, 'name': tmpl.name, 'doc_kind': tmpl.doc_kind,
            'description': tmpl.description, 'placeholders': tmpl.placeholders,
            'html_content': tmpl.html_content, 'css_content': tmpl.css_content,
            'is_active': tmpl.is_active, 'is_default': tmpl.is_default,
            'version': tmpl.version,
            'template_file_url': tmpl.template_file.url if tmpl.template_file else None,
        })
    elif request.method == 'PUT':
        tmpl.name = request.data.get('name', tmpl.name)
        tmpl.description = request.data.get('description', tmpl.description)
        tmpl.html_content = request.data.get('html_content', tmpl.html_content)
        tmpl.css_content = request.data.get('css_content', tmpl.css_content)
        tmpl.is_active = request.data.get('is_active', tmpl.is_active)
        tmpl.version += 1
        tmpl.updated_by = request.user
        if 'template_file' in request.FILES:
            tmpl.template_file = request.FILES['template_file']
            tmpl.placeholders = _extract_docx_placeholders(tmpl.template_file)
        tmpl.save()
        return Response({'id': tmpl.id, 'name': tmpl.name, 'version': tmpl.version})
    tmpl.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@finance_permission('can_manage_settings')
def file_template_set_default(request, pk):
    """Set a file template as the default for its doc_kind."""
    company = _company(request.user)
    try:
        tmpl = FileTemplate.objects.get(pk=pk, company=company)
    except FileTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    FileTemplate.objects.filter(company=company, doc_kind=tmpl.doc_kind, is_default=True).update(is_default=False)
    tmpl.is_default = True
    tmpl.save(update_fields=['is_default'])
    return Response({'status': 'ok'})


def _extract_docx_placeholders(file_obj) -> list:
    """Extract {{placeholder}} names from a DOCX file."""
    import re
    try:
        from docx import Document
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            for chunk in file_obj.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
        doc = Document(tmp_path)
        full_text = ' '.join(p.text for p in doc.paragraphs)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    full_text += ' ' + cell.text
        os.unlink(tmp_path)
        placeholders = re.findall(r'\{\{(\w+)\}\}', full_text)
        return sorted(set(placeholders))
    except Exception as e:
        logger.warning(f"Could not extract DOCX placeholders: {e}")
        return []


@api_view(['POST'])
@finance_permission('can_manage_settings')
def file_template_render(request, pk):
    """Render a DOCX template with provided data and return as download."""
    company = _company(request.user)
    try:
        tmpl = FileTemplate.objects.get(pk=pk, company=company)
    except FileTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    data = request.data.get('data', {})
    if tmpl.template_file:
        output = _render_docx_template(tmpl.template_file, data)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        response['Content-Disposition'] = f'attachment; filename="{tmpl.name}.docx"'
        return response
    elif tmpl.html_content:
        try:
            from jinja2.sandbox import SandboxedEnvironment
            env = SandboxedEnvironment()
            rendered_html = env.from_string(tmpl.html_content).render(**data)
        except Exception:
            rendered_html = tmpl.html_content
        full_html = f"<!DOCTYPE html><html dir='rtl' lang='fa'><head><meta charset='UTF-8'><style>{tmpl.css_content}</style></head><body>{rendered_html}</body></html>"
        output = generate_invoice_pdf(full_html)
        response = HttpResponse(output.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{tmpl.name}.pdf"'
        return response
    return Response({'error': 'قالب خالی است'}, status=status.HTTP_400_BAD_REQUEST)


def _render_docx_template(file_obj, data: dict) -> io.BytesIO:
    """Replace {{placeholders}} in a DOCX file with data values."""
    import re
    import tempfile
    try:
        from docx import Document
    except ImportError:
        output = io.BytesIO()
        output.write(b"python-docx required for DOCX rendering")
        output.seek(0)
        return output
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        for chunk in file_obj.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name
    try:
        doc = Document(tmp_path)
        for paragraph in doc.paragraphs:
            for run in paragraph.runs:
                for key, val in data.items():
                    placeholder = '{{' + key + '}}'
                    if placeholder in run.text:
                        run.text = run.text.replace(placeholder, str(val))
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            for key, val in data.items():
                                placeholder = '{{' + key + '}}'
                                if placeholder in run.text:
                                    run.text = run.text.replace(placeholder, str(val))
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
    finally:
        os.unlink(tmp_path)
    return output


# ============================================================
# 4. TEMPLATE MANAGEMENT ENDPOINTS (legacy in-memory)
# ============================================================

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
# 5. LETTER NUMBER MANAGEMENT ENDPOINTS
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
# 6. PAYER BALANCE ENDPOINT
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


# ============================================================
# 7. GENERATED FILE MANAGEMENT ENDPOINTS
# ============================================================

@api_view(['GET'])
@finance_permission('can_view_finance')
def generated_file_list(request):
    """List all generated files for the company with optional filters."""
    company = _company(request.user)
    qs = GeneratedFile.objects.filter(invoice__company=company, is_deleted_from_disk=False)
    file_type = request.query_params.get('file_type')
    file_format = request.query_params.get('file_format')
    if file_type:
        qs = qs.filter(file_type=file_type)
    if file_format:
        qs = qs.filter(file_format=file_format)
    data = []
    for f in qs.select_related('invoice', 'invoice__payer', 'generated_by')[:200]:
        data.append({
            'id': f.id,
            'file_name': f.file_name,
            'file_type': f.file_type,
            'file_format': f.file_format,
            'file_size': f.file_size,
            'letter_number': f.letter_number,
            'invoice_id': f.invoice_id,
            'payer_name': f.invoice.payer.name if f.invoice else '',
            'generated_by': f.generated_by.get_full_name() if f.generated_by else '',
            'created_at': str(f.created_at),
            'last_accessed': str(f.last_accessed) if f.last_accessed else None,
        })
    return Response(data)


@api_view(['GET'])
@finance_permission('can_view_finance')
def generated_file_download(request, pk):
    """Download a generated file and update last_accessed."""
    company = _company(request.user)
    try:
        gf = GeneratedFile.objects.select_related('invoice').get(pk=pk, invoice__company=company)
    except GeneratedFile.DoesNotExist:
        return Response({'error': 'فایل یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    if gf.is_deleted_from_disk or not gf.file:
        return Response({'error': 'فایل حذف شده است'}, status=status.HTTP_404_NOT_FOUND)
    from django.utils import timezone
    gf.last_accessed = timezone.now()
    gf.save(update_fields=['last_accessed'])
    content_types = {
        'pdf': 'application/pdf',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'word': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'html': 'text/html',
    }
    response = HttpResponse(gf.file.read(), content_type=content_types.get(gf.file_format, 'application/octet-stream'))
    response['Content-Disposition'] = f'attachment; filename="{gf.file_name}"'
    return response


@api_view(['POST'])
@finance_permission('can_manage_settings')
def generated_file_soft_delete(request, pk):
    """Soft-delete a generated file (mark as deleted, keep DB record)."""
    company = _company(request.user)
    try:
        gf = GeneratedFile.objects.select_related('invoice').get(pk=pk, invoice__company=company)
    except GeneratedFile.DoesNotExist:
        return Response({'error': 'فایل یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    gf.is_deleted_from_disk = True
    gf.save(update_fields=['is_deleted_from_disk'])
    return Response({'status': 'ok'})


@api_view(['POST'])
@finance_permission('can_manage_settings')
def generated_file_cleanup(request):
    """Hard-delete all soft-deleted generated files from disk and DB."""
    company = _company(request.user)
    qs = GeneratedFile.objects.filter(invoice__company=company, is_deleted_from_disk=True)
    count = qs.count()
    for gf in qs:
        if gf.file:
            try:
                gf.file.delete(save=False)
            except Exception:
                pass
    qs.delete()
    return Response({'deleted_count': count})

