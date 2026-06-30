"""Finance module URL configuration."""
from django.urls import path, include

urlpatterns = [
    path('invoices/', include('apps.invoices.urls')),
    path('finance/', include('apps.templates_app.urls')),
]
