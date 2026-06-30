from django.db import models
from django.conf import settings

class ReportTemplate(models.Model):
    DOC_KINDS = [('invoice', 'صورتحساب'), ('notice', 'اطلاعیه واریز'), ('creditor', 'بستانکاری')]
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='report_templates')
    name = models.CharField(max_length=255)
    doc_kind = models.CharField(max_length=20, choices=DOC_KINDS)
    item_type = models.ForeignKey('invoices.ItemType', on_delete=models.SET_NULL, null=True, blank=True)
    template_json = models.JSONField(default=dict, help_text='ReportBro .rpt definition')
    is_default = models.BooleanField(default=False)
    version = models.IntegerField(default=1)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['doc_kind', 'name']
    def __str__(self):
        return f'{self.name} ({self.doc_kind})'
