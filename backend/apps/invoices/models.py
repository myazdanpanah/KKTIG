"""Finance module models."""
from django.db import models
from django.conf import settings


class TenantManager(models.Manager):
    def for_company(self, company):
        return self.filter(company=company)


class Payer(models.Model):
    CUSTOMER_TYPES = [("legal", "legal"), ("natural", "natural")]
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="payers")
    code = models.CharField(max_length=10)
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    name = models.CharField(max_length=255)
    customer_type = models.CharField(max_length=10, choices=CUSTOMER_TYPES, default="legal")
    national_id = models.CharField(max_length=20, blank=True, default="")
    economic_code = models.CharField(max_length=20, blank=True, default="")
    registration_number = models.CharField(max_length=20, blank=True, default="")
    address = models.TextField(blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    mobile = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = TenantManager()

    class Meta:
        unique_together = [("company", "code")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ItemType(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="item_types")
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    objects = TenantManager()

    class Meta:
        unique_together = [("company", "code")]
        ordering = ["display_order", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ItemTypeField(models.Model):
    FIELD_TYPES = [("text", "text"), ("number", "number"), ("date", "date"), ("select", "select")]
    item_type = models.ForeignKey(ItemType, on_delete=models.CASCADE, related_name="fields")
    key = models.CharField(max_length=40)
    label = models.CharField(max_length=100)
    field_type = models.CharField(max_length=10, choices=FIELD_TYPES, default="text")
    options = models.JSONField(default=list, blank=True)
    required = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)

    class Meta:
        unique_together = [("item_type", "key")]
        ordering = ["display_order"]


class Invoice(models.Model):
    STATUS_CHOICES = [("draft", "draft"), ("submitted", "submitted"), ("approved", "approved"), ("rejected", "rejected")]
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="invoices")
    letter_number = models.CharField(max_length=50)
    payer = models.ForeignKey(Payer, on_delete=models.PROTECT, related_name="invoices")
    invoice_type = models.ForeignKey(ItemType, on_delete=models.PROTECT, related_name="invoices")
    issue_date = models.DateField()
    period_range = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    amount = models.BigIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_invoices")
    file_path = models.FileField(upload_to="invoices/pdfs/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = TenantManager()
    class Meta:
        unique_together = [("company", "letter_number")]
        ordering = ["-created_at"]
    def __str__(self):
        return f"{self.letter_number} - {self.payer.name}"
    def recalculate_amount(self):
        self.amount = sum(item.debt for item in self.items.all())
        self.save(update_fields=["amount"])


class LineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    item_type = models.ForeignKey(ItemType, on_delete=models.PROTECT)
    ref = models.CharField(max_length=100, blank=True, default="")
    customer_name = models.CharField(max_length=255, blank=True, default="")
    description = models.CharField(max_length=500, blank=True, default="")
    date = models.CharField(max_length=30, blank=True, default="")
    notes = models.CharField(max_length=500, blank=True, default="")
    debt = models.BigIntegerField(default=0)
    credit = models.BigIntegerField(default=0)
    balance = models.BigIntegerField(default=0)
    order = models.IntegerField(default=0)
    class Meta:
        ordering = ["order"]
    def save(self, *args, **kwargs):
        self.balance = self.debt - self.credit
        super().save(*args, **kwargs)


class ItemFieldValue(models.Model):
    line_item = models.ForeignKey(LineItem, on_delete=models.CASCADE, related_name="field_values")
    field = models.ForeignKey(ItemTypeField, on_delete=models.CASCADE)
    value_text = models.TextField(blank=True, default="")
    value_number = models.BigIntegerField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    class Meta:
        unique_together = [("line_item", "field")]


class Payment(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="payments")
    payer = models.ForeignKey(Payer, on_delete=models.PROTECT, related_name="payments")
    payment_code = models.CharField(max_length=50)
    payment_date = models.DateField()
    amount = models.BigIntegerField()
    tracking_number = models.CharField(max_length=50, blank=True, default="")
    description = models.TextField(blank=True, default="")
    registered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = TenantManager()
    class Meta:
        ordering = ["-payment_date"]
    def __str__(self):
        return f"{self.payment_code} - {self.payer.name} - {self.amount}"


class ManualDebt(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="manual_debts")
    payer = models.ForeignKey(Payer, on_delete=models.PROTECT, related_name="manual_debts")
    description = models.CharField(max_length=500)
    amount = models.BigIntegerField()
    date = models.DateField()
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    objects = TenantManager()
    class Meta:
        ordering = ["-date"]


class Credit(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="credits")
    payer = models.ForeignKey(Payer, on_delete=models.PROTECT, related_name="credits")
    amount = models.BigIntegerField()
    credit_date = models.DateField()
    description = models.CharField(max_length=500, blank=True, default="")
    invoice_number = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    objects = TenantManager()
    class Meta:
        ordering = ["-credit_date"]


class LetterSequence(models.Model):
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="letter_sequences")
    payer = models.ForeignKey(Payer, on_delete=models.CASCADE, related_name="letter_sequences")
    year_2digit = models.CharField(max_length=2)
    last_number = models.IntegerField(default=0)
    prefix = models.CharField(max_length=20, default="")
    class Meta:
        unique_together = [("company", "payer", "year_2digit")]
    def __str__(self):
        return f"{self.year_2digit}/{self.prefix}/{self.last_number:05d}"
    @classmethod
    def reserve_next(cls, company, payer, year_2digit):
        from django.db import transaction
        with transaction.atomic():
            seq, created = cls.objects.select_for_update().get_or_create(
                company=company, payer=payer, year_2digit=year_2digit,
                defaults={"prefix": payer.code, "last_number": 0},
            )
            seq.last_number += 1
            seq.save(update_fields=["last_number"])
            return f"{year_2digit}/{seq.prefix}/{seq.last_number:05d}"


class ApprovalRequest(models.Model):
    STATUS_CHOICES = [("pending", "pending"), ("approved", "approved"), ("rejected", "rejected")]
    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="approval_requests")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="submitted_approvals")
    payer = models.ForeignKey(Payer, on_delete=models.PROTECT, related_name="approval_requests")
    letter_number = models.CharField(max_length=50)
    letter_date = models.CharField(max_length=30)
    period_range = models.CharField(max_length=100, blank=True, default="")
    item_payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reserved_numbers = models.JSONField(default=list)
    final_letter_number = models.CharField(max_length=50, blank=True, null=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_approvals")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    objects = TenantManager()
    class Meta:
        ordering = ["-created_at"]


class GeneratedFile(models.Model):
    FILE_TYPES = [("invoice", "invoice"), ("notice", "notice"), ("creditor", "creditor")]
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name="files")
    letter_number = models.CharField(max_length=50)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    file = models.FileField(upload_to="finance/generated/")
    file_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    is_deleted_from_disk = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.file_name} ({self.file_type})"
