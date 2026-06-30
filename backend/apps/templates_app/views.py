from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ReportTemplate
from .serializers import ReportTemplateSerializer
from apps.invoices.permissions import finance_permission, get_user_company

@api_view(['GET', 'POST'])
@finance_permission('can_manage_settings')
def template_list_create(request):
    company = get_user_company(request.user)
    if request.method == 'GET':
        templates = ReportTemplate.objects.filter(company=company)
        dk = request.query_params.get('doc_kind')
        if dk:
            templates = templates.filter(doc_kind=dk)
        return Response(ReportTemplateSerializer(templates, many=True).data)
    data = request.data.copy()
    data['company'] = company.id
    data['updated_by'] = request.user.id
    ser = ReportTemplateSerializer(data=data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@finance_permission('can_manage_settings')
def template_detail(request, pk):
    company = get_user_company(request.user)
    try:
        tmpl = ReportTemplate.objects.get(pk=pk, company=company)
    except ReportTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ReportTemplateSerializer(tmpl).data)
    elif request.method == 'PUT':
        data = request.data.copy()
        data['updated_by'] = request.user.id
        data['version'] = tmpl.version + 1
        ser = ReportTemplateSerializer(tmpl, data=data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
    tmpl.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
