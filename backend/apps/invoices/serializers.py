"""DRF serializers for the Finance module."""

from rest_framework import serializers
from .models import (
    Payer, ItemType, ItemTypeField, Invoice, LineItem, ItemFieldValue,
    Payment, ManualDebt, Credit, LetterSequence, ApprovalRequest, GeneratedFile,
)


class PayerSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Payer
        fields = [
            'id', 'code', 'name', 'customer_type', 'parent',
            'national_id', 'economic_code', 'registration_number',
            'address', 'postal_code', 'phone', 'mobile', 'email',
            'is_active', 'balance', 'children_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_balance(self, obj):
        balance_map = self.context.get('balance_map', {})
        if balance_map:
            return balance_map.get(obj.id, 0)
        # Fallback for single-object serialization
        from django.db.models import Sum
        from .models import Invoice, Payment
        company = obj.company
        inv = Invoice.objects.filter(company=company, payer=obj).aggregate(t=Sum('amount'))['t'] or 0
        pay = Payment.objects.filter(company=company, payer=obj).aggregate(t=Sum('amount'))['t'] or 0
        return inv - pay

    def get_children_count(self, obj):
        return obj.children.count() if hasattr(obj, 'children') else 0


class ItemTypeFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemTypeField
        fields = ['id', 'key', 'label', 'field_type', 'options', 'required', 'display_order']
        read_only_fields = ['id']


class ItemTypeSerializer(serializers.ModelSerializer):
    fields_schema = ItemTypeFieldSerializer(many=True, read_only=True, source='fields')

    class Meta:
        model = ItemType
        fields = ['id', 'name', 'code', 'parent', 'is_active', 'display_order', 'fields_schema']
        read_only_fields = ['id']


class ItemFieldValueSerializer(serializers.ModelSerializer):
    field_key = serializers.CharField(source='field.key', read_only=True)
    field_label = serializers.CharField(source='field.label', read_only=True)

    class Meta:
        model = ItemFieldValue
        fields = ['id', 'field', 'field_key', 'field_label', 'value_text', 'value_number', 'value_date']
        read_only_fields = ['id']


class LineItemSerializer(serializers.ModelSerializer):
    field_values = ItemFieldValueSerializer(many=True, required=False)
    item_type_name = serializers.CharField(source='item_type.name', read_only=True)

    class Meta:
        model = LineItem
        fields = [
            'id', 'item_type', 'item_type_name', 'ref', 'customer_name',
            'description', 'date', 'notes', 'debt', 'credit', 'balance',
            'order', 'field_values',
        ]
        read_only_fields = ['id', 'balance']

    def create(self, validated_data):
        fv_data = validated_data.pop('field_values', [])
        item = LineItem.objects.create(**validated_data)
        for fv in fv_data:
            ItemFieldValue.objects.create(line_item=item, **fv)
        item.invoice.recalculate_amount()
        return item

    def update(self, instance, validated_data):
        fv_data = validated_data.pop('field_values', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if fv_data is not None:
            instance.field_values.all().delete()
            for fv in fv_data:
                ItemFieldValue.objects.create(line_item=instance, **fv)
        instance.invoice.recalculate_amount()
        return instance


class InvoiceSerializer(serializers.ModelSerializer):
    items = LineItemSerializer(many=True, read_only=True)
    payer_name = serializers.CharField(source='payer.name', read_only=True)
    invoice_type_name = serializers.CharField(source='invoice_type.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, default='')
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'letter_number', 'payer', 'payer_name', 'invoice_type', 'invoice_type_name',
            'issue_date', 'period_range', 'status', 'amount', 'created_by', 'created_by_name',
            'file_path', 'items', 'line_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'amount', 'created_at', 'updated_at']

    def get_line_count(self, obj):
        return obj.items.count() if hasattr(obj, 'items') else 0


class InvoiceListSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.name', read_only=True)
    invoice_type_name = serializers.CharField(source='invoice_type.name', read_only=True)
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'letter_number', 'payer_name', 'invoice_type_name',
            'issue_date', 'period_range', 'status', 'amount', 'line_count', 'created_at',
        ]

    def get_line_count(self, obj):
        return obj.items.count() if hasattr(obj, 'items') else 0


class PaymentSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.name', read_only=True)
    registered_by_name = serializers.CharField(source='registered_by.username', read_only=True, default='')

    class Meta:
        model = Payment
        fields = [
            'id', 'payer', 'payer_name', 'payment_code', 'payment_date',
            'amount', 'tracking_number', 'description', 'registered_by', 'registered_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ManualDebtSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.name', read_only=True)
    service_type = serializers.ChoiceField(choices=ManualDebt.SERVICE_TYPES, required=False, allow_blank=True, default='')

    class Meta:
        model = ManualDebt
        fields = ['id', 'payer', 'payer_name', 'description', 'service_type', 'amount', 'date', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class CreditSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.name', read_only=True)

    class Meta:
        model = Credit
        fields = ['id', 'payer', 'payer_name', 'amount', 'credit_date', 'description', 'invoice_number', 'created_at']
        read_only_fields = ['id', 'created_at']


class ApprovalRequestSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.name', read_only=True)
    requester_name = serializers.CharField(source='requester.username', read_only=True, default='')
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True, default='')
    files = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'payer', 'payer_name', 'letter_number', 'letter_date', 'period_range',
            'item_payload', 'status', 'reserved_numbers', 'final_letter_number',
            'requester', 'requester_name', 'approved_by', 'approved_by_name',
            'approved_at', 'rejection_reason', 'files', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'approved_at']

    def get_files(self, obj):
        return GeneratedFileSerializer(obj.files.all(), many=True).data


class GeneratedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedFile
        fields = ['id', 'letter_number', 'file_type', 'file', 'file_name', 'created_at']
        read_only_fields = ['id', 'created_at']
