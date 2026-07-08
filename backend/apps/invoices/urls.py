from django.urls import path
from . import views
from . import views_files

urlpatterns = [
    # Payers
    path('payers/', views.payer_list_create, name='payer-list-create'),
    path('payers/<int:pk>/', views.payer_detail, name='payer-detail'),
    path('payers/<int:pk>/balance/', views_files.payer_balance_detail, name='payer-balance-detail'),
    path('payers/tree/', views.payer_tree, name='payer-tree'),
    # Item Types
    path('item-types/', views.itemtype_list_create, name='itemtype-list-create'),
    path('item-types/<int:pk>/', views.itemtype_detail, name='itemtype-detail'),
    path('item-types/<int:pk>/fields/', views.itemtype_fields, name='itemtype-fields'),
    # Invoices
    path('invoices/', views.invoice_list_create, name='invoice-list-create'),
    path('invoices/<int:pk>/', views.invoice_detail, name='invoice-detail'),
    path('invoices/<int:pk>/items/', views.invoice_add_item, name='invoice-add-item'),
    path('invoices/<int:pk>/generate/', views_files.generate_invoice_files, name='invoice-generate'),
    path('invoices/<int:pk>/download/<str:fmt>/', views_files.download_invoice_file, name='invoice-download'),
    # File Import
    path('import/preview/', views_files.import_excel_preview, name='import-preview'),
    path('import/confirm/', views_files.import_excel_confirm, name='import-confirm'),
    # File Template Management (DOCX upload + placeholder substitution)
    path('file-templates/', views_files.file_template_list_create, name='file-template-list-create'),
    path('file-templates/<int:pk>/', views_files.file_template_detail, name='file-template-detail'),
    path('file-templates/<int:pk>/set-default/', views_files.file_template_set_default, name='file-template-set-default'),
    path('file-templates/<int:pk>/render/', views_files.file_template_render, name='file-template-render'),
    # Legacy Template Management
    path('templates/active/', views_files.get_active_template, name='template-active'),
    path('templates/save/', views_files.save_active_template, name='template-save'),
    # Letter Numbering
    path('letters/reserve/', views_files.reserve_letter_number, name='letter-reserve'),
    # Payments
    path('payments/', views.payment_list_create, name='payment-list-create'),
    path('payments/<int:pk>/', views.payment_delete, name='payment-delete'),
    # Manual Debts & Credits
    path('debts/', views.manualdebt_list_create, name='debt-list-create'),
    path('credits/', views.credit_list_create, name='credit-list-create'),
    # Approvals
    path('approvals/', views.approval_list_create, name='approval-list-create'),
    path('approvals/<int:pk>/<str:action>/', views.approval_action, name='approval-action'),
    # Generated Files Management
    path('generated-files/', views_files.generated_file_list, name='generated-file-list'),
    path('generated-files/<int:pk>/download/', views_files.generated_file_download, name='generated-file-download'),
    path('generated-files/<int:pk>/soft-delete/', views_files.generated_file_soft_delete, name='generated-file-soft-delete'),
    path('generated-files/cleanup/', views_files.generated_file_cleanup, name='generated-file-cleanup'),
    # Dashboard KPIs
    path('dashboard/', views.finance_dashboard, name='finance-dashboard'),
]
