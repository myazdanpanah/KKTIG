from django.urls import path
from . import views

urlpatterns = [
    # Payers
    path('payers/', views.payer_list_create, name='payer-list-create'),
    path('payers/<int:pk>/', views.payer_detail, name='payer-detail'),
    path('payers/tree/', views.payer_tree, name='payer-tree'),
    # Item Types
    path('item-types/', views.itemtype_list_create, name='itemtype-list-create'),
    path('item-types/<int:pk>/', views.itemtype_detail, name='itemtype-detail'),
    path('item-types/<int:pk>/fields/', views.itemtype_fields, name='itemtype-fields'),
    # Invoices
    path('invoices/', views.invoice_list_create, name='invoice-list-create'),
    path('invoices/<int:pk>/', views.invoice_detail, name='invoice-detail'),
    path('invoices/<int:pk>/items/', views.invoice_add_item, name='invoice-add-item'),
    # Payments
    path('payments/', views.payment_list_create, name='payment-list-create'),
    path('payments/<int:pk>/', views.payment_delete, name='payment-delete'),
    # Manual Debts & Credits
    path('debts/', views.manualdebt_list_create, name='debt-list-create'),
    path('credits/', views.credit_list_create, name='credit-list-create'),
    # Approvals
    path('approvals/', views.approval_list_create, name='approval-list-create'),
    path('approvals/<int:pk>/<str:action>/', views.approval_action, name='approval-action'),
    # Dashboard KPIs
    path('dashboard/', views.finance_dashboard, name='finance-dashboard'),
]
