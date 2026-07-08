"""Finance report template views.

Full CRUD for ReportTemplate, data schema for binding, and preview rendering.
"""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ReportTemplate
from .serializers import ReportTemplateSerializer
from apps.invoices.permissions import finance_permission, get_user_company


# ============================================================
# 1. TEMPLATE CRUD
# ============================================================

@api_view(['GET', 'POST'])
@finance_permission('can_manage_settings')
def template_list_create(request):
    """List all templates for the company, optionally filtered by doc_kind."""
    company = get_user_company(request.user)
    if request.method == 'GET':
        templates = ReportTemplate.objects.filter(company=company)
        dk = request.query_params.get('doc_kind')
        if dk:
            templates = templates.filter(doc_kind=dk)
        return Response(ReportTemplateSerializer(templates, many=True).data)
    data = request.data.copy()
    data['company'] = company.id
    data['updated_by'] = request.user.id
    ser = ReportTemplateSerializer(data=data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_manage_settings')
def template_detail(request, pk):
    """Retrieve, update, or delete a template."""
    company = get_user_company(request.user)
    try:
        tmpl = ReportTemplate.objects.get(pk=pk, company=company)
    except ReportTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ReportTemplateSerializer(tmpl).data)
    elif request.method == 'PUT':
        data = request.data.copy()
        data['updated_by'] = request.user.id
        data['version'] = tmpl.version + 1
        ser = ReportTemplateSerializer(tmpl, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
    tmpl.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@finance_permission('can_manage_settings')
def template_set_default(request, pk):
    """Set a template as the default for its doc_kind."""
    company = get_user_company(request.user)
    try:
        tmpl = ReportTemplate.objects.get(pk=pk, company=company)
    except ReportTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    # Unset other defaults for this doc_kind
    ReportTemplate.objects.filter(company=company, doc_kind=tmpl.doc_kind, is_default=True).update(is_default=False)
    tmpl.is_default = True
    tmpl.save(update_fields=['is_default'])
    return Response(ReportTemplateSerializer(tmpl).data)


@api_view(['POST'])
@finance_permission('can_manage_settings')
def template_duplicate(request, pk):
    """Duplicate a template."""
    company = get_user_company(request.user)
    try:
        tmpl = ReportTemplate.objects.get(pk=pk, company=company)
    except ReportTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    new_tmpl = ReportTemplate.objects.create(
        company=company,
        name=f"{tmpl.name} (کپی)",
        doc_kind=tmpl.doc_kind,
        item_type=tmpl.item_type,
        template_json=tmpl.template_json,
        is_default=False,
        version=1,
        updated_by=request.user,
    )
    return Response(ReportTemplateSerializer(new_tmpl).data, status=status.HTTP_201_CREATED)


# ============================================================
# 2. DATA SCHEMA (available fields for template binding)
# ============================================================

# Invoice data schema for the report designer's data panel
INVOICE_DATA_SCHEMA = {
    'seller': {
        'label': 'فروشنده (Seller)',
        'fields': [
            {'key': 'seller.company_name', 'label': 'نام شرکت', 'type': 'text'},
            {'key': 'seller.national_id', 'label': 'شناسه ملی', 'type': 'text'},
            {'key': 'seller.economic_code', 'label': 'کد اقتصادی', 'type': 'text'},
            {'key': 'seller.registration_number', 'label': 'شماره ثبت', 'type': 'text'},
            {'key': 'seller.address', 'label': 'نشانی', 'type': 'text'},
            {'key': 'seller.postal_code', 'label': 'کد پستی', 'type': 'text'},
            {'key': 'seller.phone', 'label': 'تلفن', 'type': 'text'},
            {'key': 'seller.manager_name', 'label': 'نام مدیر', 'type': 'text'},
            {'key': 'seller.manager_position', 'label': 'سمت مدیر', 'type': 'text'},
            {'key': 'seller.stamp_path', 'label': 'مهر شرکت', 'type': 'image'},
            {'key': 'seller.signature_path', 'label': 'امضای مدیر', 'type': 'image'},
        ],
    },
    'buyer': {
        'label': 'خریدار (Buyer)',
        'fields': [
            {'key': 'buyer.name', 'label': 'نام خریدار', 'type': 'text'},
            {'key': 'buyer.national_id', 'label': 'شناسه ملی', 'type': 'text'},
            {'key': 'buyer.economic_code', 'label': 'کد اقتصادی', 'type': 'text'},
            {'key': 'buyer.address', 'label': 'نشانی', 'type': 'text'},
            {'key': 'buyer.postal_code', 'label': 'کد پستی', 'type': 'text'},
            {'key': 'buyer.phone', 'label': 'تلفن', 'type': 'text'},
        ],
    },
    'invoice': {
        'label': 'صورتحساب (Invoice)',
        'fields': [
            {'key': 'invoice.letter_number', 'label': 'شماره نامه', 'type': 'text'},
            {'key': 'invoice.issue_date', 'label': 'تاریخ صدور', 'type': 'date'},
            {'key': 'invoice.service_type', 'label': 'نوع خدمت', 'type': 'text'},
            {'key': 'invoice.period_range', 'label': 'دوره', 'type': 'text'},
            {'key': 'invoice.total_debt', 'label': 'جمع بدهکار', 'type': 'currency'},
            {'key': 'invoice.total_credit', 'label': 'جمع بستانکار', 'type': 'currency'},
            {'key': 'invoice.total_balance', 'label': 'مانده نهایی', 'type': 'currency'},
        ],
    },
    'row': {
        'label': 'ردیف‌ها (Line Items) — حلقه {% for row in page.rows %}',
        'fields': [
            {'key': 'row.index', 'label': 'ردیف', 'type': 'number'},
            {'key': 'row.ref', 'label': 'شماره قرارداد', 'type': 'text'},
            {'key': 'row.customer_name', 'label': 'نام مسافر', 'type': 'text'},
            {'key': 'row.description', 'label': 'شرح خدمات', 'type': 'text'},
            {'key': 'row.date', 'label': 'تاریخ', 'type': 'date'},
            {'key': 'row.notes', 'label': 'توضیحات', 'type': 'text'},
            {'key': 'row.debt', 'label': 'بدهکار', 'type': 'currency'},
            {'key': 'row.credit', 'label': 'بستانکار', 'type': 'currency'},
            {'key': 'row.balance', 'label': 'مانده', 'type': 'currency'},
        ],
    },
    'bank': {
        'label': 'اطلاعات بانکی (Bank)',
        'fields': [
            {'key': 'bank.bank_name1', 'label': 'نام بانک اول', 'type': 'text'},
            {'key': 'bank.account_number1', 'label': 'شماره حساب اول', 'type': 'text'},
            {'key': 'bank.shaba_number1', 'label': 'شماره شبا اول', 'type': 'text'},
            {'key': 'bank.bank_name2', 'label': 'نام بانک دوم', 'type': 'text'},
            {'key': 'bank.account_number2', 'label': 'شماره حساب دوم', 'type': 'text'},
            {'key': 'bank.shaba_number2', 'label': 'شماره شبا دوم', 'type': 'text'},
        ],
    },
    'system': {
        'label': 'سیستمی (System)',
        'fields': [
            {'key': 'system.current_date', 'label': 'تاریخ امروز', 'type': 'date'},
            {'key': 'system.current_time', 'label': 'زمان امروز', 'type': 'text'},
            {'key': 'system.page_number', 'label': 'شماره صفحه', 'type': 'number'},
            {'key': 'system.total_pages', 'label': 'تعداد کل صفحات', 'type': 'number'},
        ],
    },
}


@api_view(['GET'])
@finance_permission('can_edit_template')
def template_data_schema(request):
    """Return the available data fields for template binding."""
    return Response(INVOICE_DATA_SCHEMA)


# ============================================================
# 3. TEMPLATE PREVIEW (render with sample data)
# ============================================================

SAMPLE_DATA = {
    'seller': {
        'company_name': 'شرکت نمونه',
        'national_id': '10320156789',
        'economic_code': '41100000001',
        'registration_number': '12345',
        'address': 'تهران، خیابان ولیعصر',
        'postal_code': '1234567890',
        'phone': '021-12345678',
        'manager_name': 'علی محمدی',
        'manager_position': 'مدیرعامل',
    },
    'buyer': {
        'name': 'شرکت خریدار',
        'national_id': '10870012345',
        'economic_code': '41200000002',
        'address': 'تهران، خیابان آزادی',
        'postal_code': '0987654321',
        'phone': '021-87654321',
    },
    'invoice': {
        'letter_number': '1405/00001',
        'issue_date': '۱۴۰۵/۰۴/۱۵',
        'service_type': 'بلیط پرواز',
        'period_range': '۱ تا ۱۵ تیر ۱۴۰۵',
        'total_debt': '۱۵,۰۰۰,۰۰۰',
        'total_credit': '۵,۰۰۰,۰۰۰',
        'total_balance': '۱۰,۰۰۰,۰۰۰',
    },
    'row': [
        {'index': '۱', 'ref': 'CON-001', 'customer_name': 'احمد رضایی', 'description': 'بلیط تهران-استانبول', 'date': '۱۴۰۵/۰۴/۰۱', 'notes': '', 'debt': '۸,۰۰۰,۰۰۰', 'credit': '۳,۰۰۰,۰۰۰', 'balance': '۵,۰۰۰,۰۰۰'},
        {'index': '۲', 'ref': 'CON-002', 'customer_name': 'سارا احمدی', 'description': 'بلیط تهران-دبی', 'date': '۱۴۰۵/۰۴/۰۵', 'notes': '', 'debt': '۷,۰۰۰,۰۰۰', 'credit': '۲,۰۰۰,۰۰۰', 'balance': '۵,۰۰۰,۰۰۰'},
    ],
    'bank': {
        'bank_name1': 'بانک ملت',
        'account_number1': '1234567890123',
        'shaba_number1': 'IR12 3456 7890 1234 5678 9012 3456',
        'bank_name2': '',
        'account_number2': '',
        'shaba_number2': '',
    },
    'system': {
        'current_date': '۱۴۰۵/۰۴/۱۵',
        'current_time': '۱۰:۳۰',
        'page_number': '۱',
        'total_pages': '۱',
    },
}


def _resolve_template_variable(key, data):
    """Resolve a dot-notation key like 'seller.company_name' from nested data."""
    parts = key.split('.')
    obj = data
    for part in parts:
        if isinstance(obj, dict):
            obj = obj.get(part, '')
        else:
            return ''
    return obj or ''


@api_view(['POST'])
@finance_permission('can_edit_template')
def template_preview(request):
    """
    Render a template with sample data for preview.

    POST JSON: { "template_json": { "elements": [...], "page": {...} } }
    Returns HTML string for rendering in an iframe.
    """
    template_json = request.data.get('template_json', {})
    elements = template_json.get('elements', [])
    page = template_json.get('page', {})
    page_width = page.get('width', 794)
    page_height = page.get('height', 1123)
    margin_top = page.get('marginTop', 40)
    margin_right = page.get('marginRight', 40)
    margin_bottom = page.get('marginBottom', 40)
    margin_left = page.get('marginLeft', 40)
    orientation = page.get('orientation', 'portrait')

    if orientation == 'landscape':
        page_width, page_height = page_height, page_width

    css = f"""
    @page {{ size: {'landscape' if orientation == 'landscape' else 'portrait'}; margin: 0; }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ width: {page_width}px; height: {page_height}px; position: relative; font-family: 'B Nazanin', Tahoma, Arial, sans-serif; overflow: hidden; background: white; }}
    .report-element {{ position: absolute; overflow: hidden; }}
    .report-text {{ white-space: pre-wrap; word-wrap: break-word; }}
    .report-line {{ border: none; }}
    .report-rectangle {{ background: transparent; }}
    .report-image img {{ width: 100%; height: 100%; object-fit: contain; }}
    table {{ border-collapse: collapse; width: 100%; }}
    table td, table th {{ border: 1px solid #000; padding: 4px; text-align: center; }}
    table th {{ background: #f0f0f0; font-weight: bold; }}
    """

    elements_html = ''
    for el in elements:
        x = el.get('x', 0)
        y = el.get('y', 0)
        w = el.get('width', 200)
        h = el.get('height', 30)
        el_type = el.get('type', 'text')
        style = el.get('style', {})
        data_binding = el.get('dataBinding', '')

        # Resolve data binding
        content = ''
        if data_binding and el_type in ('text', 'dataField'):
            content = str(_resolve_template_variable(data_binding, SAMPLE_DATA))
        elif el_type == 'text':
            content = el.get('text', '')
        elif el_type == 'dataField':
            content = f'{{{{ {data_binding} }}}}' if data_binding else '...'
        elif el_type == 'pageNumber':
            content = '۱'
        elif el_type == 'totalPages':
            content = '۱'

        font_size = style.get('fontSize', 12)
        font_bold = style.get('bold', False)
        font_italic = style.get('italic', False)
        font_underline = style.get('underline', False)
        text_align = style.get('textAlign', 'left')
        text_color = style.get('color', '#000000')
        bg_color = style.get('backgroundColor', 'transparent')
        border_color = style.get('borderColor', '#000000')
        border_width = style.get('borderWidth', 0)
        border_style = style.get('borderStyle', 'solid')
        vertical_align = style.get('verticalAlign', 'top')
        font_family = style.get('fontFamily', 'B Nazanin, Tahoma')

        el_css = f"left:{x}px;top:{y}px;width:{w}px;height:{h}px;"
        if bg_color and bg_color != 'transparent':
            el_css += f"background:{bg_color};"
        if border_width > 0:
            el_css += f"border:{border_width}px {border_style} {border_color};"

        text_css = f"font-size:{font_size}px;font-family:{font_family};color:{text_color};text-align:{text_align};"
        if font_bold:
            text_css += 'font-weight:bold;'
        if font_italic:
            text_css += 'font-style:italic;'
        if font_underline:
            text_css += 'text-decoration:underline;'
        if vertical_align and vertical_align != 'top':
            el_css += f"display:flex;align-items:{vertical_align};"
        text_css += 'padding:4px;'

        if el_type == 'line':
            line_direction = el.get('lineDirection', 'horizontal')
            if line_direction == 'vertical':
                el_css += f"border-left:{max(border_width, 2)}px solid {border_color};"
            else:
                el_css += f"border-top:{max(border_width, 2)}px solid {border_color};"
            elements_html += f'<div class="report-element report-line" style="{el_css}"></div>\n'
        elif el_type == 'rectangle':
            elements_html += f'<div class="report-element report-rectangle" style="{el_css}"></div>\n'
        elif el_type == 'image':
            img_src = el.get('src', '')
            elements_html += f'<div class="report-element report-image" style="{el_css}"><img src="{img_src}" /></div>\n'
        else:
            elements_html += f'<div class="report-element report-text" style="{el_css}"><span style="{text_css}">{content}</span></div>\n'

    html = f"""<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<style>{css}</style>
</head>
<body>
{elements_html}
</body>
</html>"""

    return Response({'html': html, 'width': page_width, 'height': page_height})


# ============================================================
# 4. ACTIVE TEMPLATE (backward-compatible get/save)
# ============================================================

@api_view(['GET'])
@finance_permission('can_view_finance')
def get_active_template(request):
    """Get the active invoice template (backward-compatible)."""
    company = get_user_company(request.user)
    template = ReportTemplate.objects.filter(company=company, is_default=True, doc_kind='invoice').first()
    if template:
        tj = template.template_json if isinstance(template.template_json, dict) else {}
        return Response({
            'id': template.id,
            'name': template.name,
            'html': tj.get('html', ''),
            'css': tj.get('css', ''),
            'settings': tj.get('settings', {}),
            'elements': tj.get('elements', []),
            'page': tj.get('page', {}),
        })
    return Response({'html': '', 'css': '', 'settings': {}, 'elements': [], 'page': {}})


@api_view(['POST'])
@finance_permission('can_edit_template')
def save_active_template(request):
    """Save the active invoice template (backward-compatible)."""
    company = get_user_company(request.user)
    html = request.data.get('html', '')
    css = request.data.get('css', '')
    settings_data = request.data.get('settings', {})
    elements = request.data.get('elements', [])
    page = request.data.get('page', {})
    template_name = request.data.get('name', 'قالب اصلی')
    doc_kind = request.data.get('doc_kind', 'invoice')

    template_json = {
        'html': html,
        'css': css,
        'settings': settings_data,
        'elements': elements,
        'page': page,
    }

    # Try to update existing default, or create new
    existing = ReportTemplate.objects.filter(company=company, doc_kind=doc_kind, is_default=True).first()
    if existing:
        existing.template_json = template_json
        existing.name = template_name
        existing.version += 1
        existing.updated_by = request.user
        existing.save()
        return Response(ReportTemplateSerializer(existing).data)
    else:
        tmpl = ReportTemplate.objects.create(
            company=company,
            name=template_name,
            doc_kind=doc_kind,
            template_json=template_json,
            is_default=True,
            updated_by=request.user,
        )
        return Response(ReportTemplateSerializer(tmpl).data, status=status.HTTP_201_CREATED)
