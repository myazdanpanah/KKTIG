from rest_framework import serializers
from .models import ReportTemplate

class ReportTemplateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, default='')
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'doc_kind', 'item_type', 'template_json', 'is_default', 'version', 'updated_by', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'version', 'created_at', 'updated_at']
