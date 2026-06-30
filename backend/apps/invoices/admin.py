from django.contrib import admin
from .models import (
    Payer, ItemType, ItemTypeField, Invoice, LineItem, ItemFieldValue,
    Payment, ManualDebt, Credit, LetterSequence, ApprovalRequest, GeneratedFile,
)


class ItemTypeFieldInline(admin.TabularInline):
    model = ItemTypeField
    extra = 0


class LineItemInline(admin.TabularInline):
    model = LineItem
    extra = 0


class ItemFieldValueInline(admin.TabularInline):
    model = ItemFieldValue
    extra = 0


class GeneratedFileInline(admin.TabularInline):
    model = GeneratedFile
    extra = 0


@admin.register(Payer)
class PayerAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'customer_type', 'company', 'is_active')
    list_filter = ('company', 'customer_type', 'is_active')
    search_fields = ('name', 'code')


@admin.register(ItemType)
class ItemTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'company', 'is_active', 'display_order')
    list_filter = ('company', 'is_active')
    inlines = [ItemTypeFieldInline]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('letter_number', 'payer', 'invoice_type', 'status', 'amount', 'issue_date')
    list_filter = ('company', 'status', 'invoice_type')
    search_fields = ('letter_number', 'payer__name')
    inlines = [LineItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_code', 'payer', 'amount', 'payment_date')
    list_filter = ('company',)


@admin.register(ManualDebt)
class ManualDebtAdmin(admin.ModelAdmin):
    list_display = ('payer', 'description', 'amount', 'date')
    list_filter = ('company',)


@admin.register(Credit)
class CreditAdmin(admin.ModelAdmin):
    list_display = ('payer', 'amount', 'credit_date', 'invoice_number')
    list_filter = ('company',)


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ('letter_number', 'payer', 'status', 'requester', 'approved_by')
    list_filter = ('company', 'status')
    inlines = [GeneratedFileInline]


@admin.register(LetterSequence)
class LetterSequenceAdmin(admin.ModelAdmin):
    list_display = ('company', 'payer', 'year_2digit', 'last_number')
    list_filter = ('company',)
