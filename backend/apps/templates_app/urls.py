from django.urls import path
from . import views
urlpatterns = [
    path('templates/', views.template_list_create, name='template-list-create'),
    path('templates/<int:pk>/', views.template_detail, name='template-detail'),
]
