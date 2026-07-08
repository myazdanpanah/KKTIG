from django.urls import path
from . import views

urlpatterns = [
    # Template CRUD
    path('templates/', views.template_list_create, name='template-list-create'),
    path('templates/<int:pk>/', views.template_detail, name='template-detail'),
    path('templates/<int:pk>/set-default/', views.template_set_default, name='template-set-default'),
    path('templates/<int:pk>/duplicate/', views.template_duplicate, name='template-duplicate'),
    # Data schema & preview
    path('templates/data-schema/', views.template_data_schema, name='template-data-schema'),
    path('templates/preview/', views.template_preview, name='template-preview'),
    # Active template (backward-compatible)
    path('templates/active/', views.get_active_template, name='template-active'),
    path('templates/save/', views.save_active_template, name='template-save'),
]
