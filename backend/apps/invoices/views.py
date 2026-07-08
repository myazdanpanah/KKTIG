"""Finance module API views."""

from django.db import models as db_models
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Payer, ItemType, ItemTypeField, Invoice, LineItem, ItemFieldValue,
    Payment, ManualDebt, Credit, LetterSequence, ApprovalRequest, GeneratedFile,
)
from .serializers import (
    PayerSerializer, ItemTypeSerializer, ItemTypeFieldSerializer,
    InvoiceSerializer, InvoiceListSerializer, LineItemSerializer,
    PaymentSerializer, ManualDebtSerializer, CreditSerializer,
    ApprovalRequestSerializer, GeneratedFileSerializer,
)
from .permissions import finance_permission, get_user_company
from .utils import today_jalali


def _company(user):
    return get_user_company(user)


def _payer_balance(payer, company):
    """Compute balance for a single payer."""
    from django.db.models import Sum as PSum
    inv = Invoice.objects.filter(company=company, payer=payer).aggregate(t=PSum('amount'))['t'] or 0
    pay = Payment.objects.filter(company=company, payer=payer).aggregate(t=PSum('amount'))['t'] or 0
    return inv - pay


# ---- Payer CRUD ----

@api_view(['GET', 'POST'])
@finance_permission('can_manage_payers')
def payer_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        payers = Payer.objects.filter(company=company)
        parent_id = request.query_params.get('parent')
        root_only = request.query_params.get('root_only')
        if parent_id:
            payers = payers.filter(parent_id=parent_id)
        elif root_only == 'true':
            payers = payers.filter(parent__isnull=True)
        search = request.query_params.get('search')
        if search:
            payers = payers.filter(
                db_models.Q(name__icontains=search) | db_models.Q(code__icontains=search)
            )
        # Bulk-compute balances to avoid N+1
        from django.db.models import Sum as PSum
        inv_totals = dict(
            Invoice.objects.filter(company=company)
            .values('payer_id').annotate(t=PSum('amount')).values_list('payer_id', 't')
        )
        pay_totals = dict(
            Payment.objects.filter(company=company)
            .values('payer_id').annotate(t=PSum('amount')).values_list('payer_id', 't')
        )
        balance_map = {}
        for pid in set(list(inv_totals.keys()) + list(pay_totals.keys())):
            balance_map[pid] = (inv_totals.get(pid, 0) or 0) - (pay_totals.get(pid, 0) or 0)
        return Response(PayerSerializer(payers, many=True, context={'balance_map': balance_map}).data)
    elif request.method == 'POST':
        serializer = PayerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_manage_payers')
def payer_detail(request, pk):
    company = _company(request.user)
    try:
        payer = Payer.objects.get(pk=pk, company=company)
    except Payer.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(PayerSerializer(payer).data)
    elif request.method == 'PUT':
        serializer = PayerSerializer(payer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    elif request.method == 'DELETE':
        payer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@finance_permission('can_manage_payers')
def payer_tree(request):
    """Return the full payer hierarchy tree."""
    company = _company(request.user)
    roots = Payer.objects.filter(company=company, parent__isnull=True)
    def build_tree(payer):
        children = Payer.objects.filter(company=company, parent=payer)
        return {
            'id': payer.id,
            'code': payer.code,
            'name': payer.name,
            'balance': _payer_balance(payer, company),
            'children': [build_tree(c) for c in children],
        }
    return Response([build_tree(p) for p in roots])


# ---- ItemType CRUD ----

@api_view(['GET', 'POST'])
@finance_permission('can_manage_settings')
def itemtype_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        types = ItemType.objects.filter(company=company)
        return Response(ItemTypeSerializer(types, many=True).data)
    elif request.method == 'POST':
        serializer = ItemTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_manage_settings')
def itemtype_detail(request, pk):
    company = _company(request.user)
    try:
        item_type = ItemType.objects.get(pk=pk, company=company)
    except ItemType.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ItemTypeSerializer(item_type).data)
    elif request.method == 'PUT':
        serializer = ItemTypeSerializer(item_type, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    elif request.method == 'DELETE':
        item_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@finance_permission('can_manage_settings')
def itemtype_fields(request, pk):
    """Bulk-set fields for an ItemType."""
    company = _company(request.user)
    try:
        item_type = ItemType.objects.get(pk=pk, company=company)
    except ItemType.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    fields_data = request.data.get('fields', [])
    item_type.fields.all().delete()
    for i, f in enumerate(fields_data):
        ItemTypeField.objects.create(
            item_type=item_type,
            key=f['key'],
            label=f['label'],
            field_type=f.get('field_type', 'text'),
            options=f.get('options', []),
            required=f.get('required', False),
            display_order=f.get('display_order', i),
        )
    return Response(ItemTypeSerializer(item_type).data)


# ---- Invoice CRUD ----

@api_view(['GET', 'POST'])
@finance_permission('can_issue')
def invoice_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        invoices = Invoice.objects.filter(company=company).select_related('payer', 'invoice_type', 'created_by')
        payer_id = request.query_params.get('payer')
        status_filter = request.query_params.get('status')
        if payer_id:
            invoices = invoices.filter(payer_id=payer_id)
        if status_filter:
            invoices = invoices.filter(status=status_filter)
        return Response(InvoiceListSerializer(invoices, many=True).data)
    elif request.method == 'POST':
        data = request.data.copy()
        data['company'] = company.id
        data['created_by'] = request.user.id
        # Auto-generate letter number if not provided
        if not data.get('letter_number'):
            payer_id = data.get('payer')
            payer = Payer.objects.get(pk=payer_id, company=company)
            from .utils import today_jalali
            jy, _, _ = today_jalali()
            year_2digit = str(jy)[-2:]
            data['letter_number'] = LetterSequence.reserve_next(company, payer, year_2digit)
        serializer = InvoiceSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_issue')
def invoice_detail(request, pk):
    company = _company(request.user)
    try:
        invoice = Invoice.objects.select_related('payer', 'invoice_type', 'created_by').prefetch_related('items', 'items__field_values').get(pk=pk, company=company)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(InvoiceSerializer(invoice).data)
    elif request.method == 'PUT':
        if invoice.status in ('approved',):
            return Response({'error': 'Cannot edit approved invoice'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = InvoiceSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    elif request.method == 'DELETE':
        if invoice.status == 'approved':
            return Response({'error': 'Cannot delete approved invoice'}, status=status.HTTP_400_BAD_REQUEST)
        invoice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@finance_permission('can_issue')
def invoice_add_item(request, pk):
    company = _company(request.user)
    try:
        invoice = Invoice.objects.get(pk=pk, company=company)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if invoice.status == 'approved':
        return Response({'error': 'Cannot modify approved invoice'}, status=status.HTTP_400_BAD_REQUEST)
    data = request.data.copy()
    data['invoice'] = invoice.id
    data['order'] = invoice.items.count()
    serializer = LineItemSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@finance_permission('can_pay')
def payment_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        payments = Payment.objects.filter(company=company).select_related('payer', 'registered_by')
        payer_id = request.query_params.get('payer')
        if payer_id:
            payments = payments.filter(payer_id=payer_id)
        return Response(PaymentSerializer(payments, many=True).data)
    elif request.method == 'POST':
        data = request.data.copy()
        data['company'] = company.id
        data['registered_by'] = request.user.id
        serializer = PaymentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@finance_permission('can_delete_payment')
def payment_delete(request, pk):
    company = _company(request.user)
    try:
        payment = Payment.objects.get(pk=pk, company=company)
    except Payment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    payment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@finance_permission('can_issue')
def manualdebt_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        debts = ManualDebt.objects.filter(company=company).select_related('payer')
        payer_id = request.query_params.get('payer')
        if payer_id:
            debts = debts.filter(payer_id=payer_id)
        return Response(ManualDebtSerializer(debts, many=True).data)
    elif request.method == 'POST':
        data = request.data.copy()
        data['company'] = company.id
        serializer = ManualDebtSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@finance_permission('can_issue')
def manualdebt_detail(request, pk):
    company = _company(request.user)
    try:
        debt = ManualDebt.objects.get(pk=pk, company=company)
    except ManualDebt.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PUT':
        serializer = ManualDebtSerializer(debt, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    elif request.method == 'DELETE':
        debt.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@finance_permission('can_issue')
def credit_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        credits = Credit.objects.filter(company=company).select_related('payer')
        payer_id = request.query_params.get('payer')
        if payer_id:
            credits = credits.filter(payer_id=payer_id)
        return Response(CreditSerializer(credits, many=True).data)
    elif request.method == 'POST':
        data = request.data.copy()
        data['company'] = company.id
        serializer = CreditSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@finance_permission('can_issue')
def credit_detail(request, pk):
    company = _company(request.user)
    try:
        credit = Credit.objects.get(pk=pk, company=company)
    except Credit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    credit.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@finance_permission('can_submit')
def approval_list_create(request):
    company = _company(request.user)
    if request.method == 'GET':
        reqs = ApprovalRequest.objects.filter(company=company).select_related('payer', 'requester', 'approved_by')
        status_filter = request.query_params.get('status')
        if status_filter:
            reqs = reqs.filter(status=status_filter)
        return Response(ApprovalRequestSerializer(reqs, many=True).data)
    elif request.method == 'POST':
        data = request.data.copy()
        data['company'] = company.id
        data['requester'] = request.user.id
        serializer = ApprovalRequestSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@finance_permission('can_approve')
def approval_action(request, pk, action):
    company = _company(request.user)
    try:
        approval = ApprovalRequest.objects.get(pk=pk, company=company)
    except ApprovalRequest.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if approval.status != 'pending':
        return Response({'error': 'Request already processed'}, status=status.HTTP_400_BAD_REQUEST)
    if action == 'approve':
        approval.status = 'approved'
        approval.approved_by = request.user
        approval.approved_at = timezone.now()
        approval.final_letter_number = approval.letter_number
    elif action == 'reject':
        approval.status = 'rejected'
        approval.rejection_reason = request.data.get('reason', '')
        approval.approved_by = request.user
        approval.approved_at = timezone.now()
    else:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
    approval.save()
    return Response(ApprovalRequestSerializer(approval).data)


@api_view(['GET'])
@finance_permission('can_view_finance')
def finance_dashboard(request):
    company = _company(request.user)
    from datetime import date, timedelta
    today = date.today()
    month_start = today.replace(day=1)
    month_end = (month_start + timedelta(days=32)).replace(day=1)
    invoices = Invoice.objects.filter(company=company)
    payments = Payment.objects.filter(company=company)
    payers = Payer.objects.filter(company=company)

    # Efficient balance calculation using DB aggregates
    from django.db.models import Sum, Count, Q
    invoices_agg = invoices.aggregate(
        total_amount=Sum('amount'),
        monthly_amount=Sum('amount', filter=Q(issue_date__gte=month_start)),
        draft_count=Count('id', filter=Q(status='draft')),
        submitted_count=Count('id', filter=Q(status='submitted')),
        approved_count=Count('id', filter=Q(status='approved')),
        rejected_count=Count('id', filter=Q(status='rejected')),
    )
    payments_agg = payments.aggregate(
        total_amount=Sum('amount'),
        monthly_amount=Sum('amount', filter=Q(payment_date__gte=month_start)),
    )
    # Compute balance per payer: invoices_total - payments_total
    from django.db.models import Sum as PSum
    payer_inv_totals = dict(
        Invoice.objects.filter(company=company)
        .values('payer_id')
        .annotate(t=PSum('amount'))
        .values_list('payer_id', 't')
    )
    payer_pay_totals = dict(
        Payment.objects.filter(company=company)
        .values('payer_id')
        .annotate(t=PSum('amount'))
        .values_list('payer_id', 't')
    )
    payer_balances = {}
    for p in payers:
        inv = payer_inv_totals.get(p.id, 0) or 0
        pay = payer_pay_totals.get(p.id, 0) or 0
        payer_balances[p.id] = inv - pay
    total_receivable = sum(b for b in payer_balances.values() if b > 0)
    total_invoiced = invoices_agg['total_amount'] or 0
    total_paid = payments_agg['total_amount'] or 0
    monthly_invoiced = invoices_agg['monthly_amount'] or 0
    monthly_paid = payments_agg['monthly_amount'] or 0
    pending_approvals = ApprovalRequest.objects.filter(company=company, status='pending').count()

    # Credits & manual debts
    credits_total = Credit.objects.filter(company=company).aggregate(t=Sum('amount'))['t'] or 0
    debts_total = ManualDebt.objects.filter(company=company).aggregate(t=Sum('amount'))['t'] or 0

    # Top debtors (positive balances)
    top_debtors = sorted(
        [{'name': p.name, 'code': p.code, 'balance': payer_balances.get(p.id, 0)}
         for p in payers if payer_balances.get(p.id, 0) > 0],
        key=lambda x: x['balance'], reverse=True
    )[:10]

    # Recent invoices (last 5)
    recent_invoices = [
        {'id': inv.id, 'letter_number': inv.letter_number, 'payer_name': inv.payer.name,
         'amount': inv.amount, 'status': inv.status, 'issue_date': str(inv.issue_date)}
        for inv in invoices.select_related('payer').order_by('-created_at')[:5]
    ]

    # Recent payments (last 5)
    recent_payments = [
        {'id': pmt.id, 'payment_code': pmt.payment_code, 'payer_name': pmt.payer.name,
         'amount': pmt.amount, 'date': str(pmt.payment_date), 'tracking': pmt.tracking_number}
        for pmt in payments.select_related('payer').order_by('-created_at')[:5]
    ]

    # Revenue by invoice type (single query)
    revenue_by_type = list(
        Invoice.objects.filter(company=company)
        .values('invoice_type__name', 'invoice_type__code')
        .annotate(amount=Sum('amount'))
        .filter(amount__gt=0)
        .order_by('-amount')
        .values_list('invoice_type__name', 'invoice_type__code', 'amount')
    )
    revenue_by_type = [{'name': r[0] or 'Unknown', 'code': r[1] or '', 'amount': r[2]} for r in revenue_by_type]

    return Response({
        'total_receivable': total_receivable,
        'total_invoiced': total_invoiced,
        'total_paid': total_paid,
        'monthly_invoiced': monthly_invoiced,
        'monthly_paid': monthly_paid,
        'pending_approvals': pending_approvals,
        'total_payers': payers.count(),
        'total_invoices': invoices.count(),
        'top_debtors': top_debtors,
        'draft_invoices': invoices_agg['draft_count'] or 0,
        'submitted_invoices': invoices_agg['submitted_count'] or 0,
        'approved_invoices': invoices_agg['approved_count'] or 0,
        'rejected_invoices': invoices_agg['rejected_count'] or 0,
        'total_credits': credits_total,
        'total_manual_debts': debts_total,
        'recent_invoices': recent_invoices,
        'recent_payments': recent_payments,
        'revenue_by_type': revenue_by_type,
    })
