import api from './client'

export const financeApi = {
  // Dashboard
  dashboard: () => api.get('/invoices/dashboard/'),
  // Payers
  payers: (params?: Record<string, string>) => api.get('/invoices/payers/', { params }),
  payer: (id: number) => api.get(`/invoices/payers/${id}/`),
  createPayer: (data: Record<string, unknown>) => api.post('/invoices/payers/', data),
  updatePayer: (id: number, data: Record<string, unknown>) => api.put(`/invoices/payers/${id}/`, data),
  deletePayer: (id: number) => api.delete(`/invoices/payers/${id}/`),
  payerTree: () => api.get('/invoices/payers/tree/'),
  // Item Types
  itemTypes: () => api.get('/invoices/item-types/'),
  createItemType: (data: Record<string, unknown>) => api.post('/invoices/item-types/', data),
  updateItemType: (id: number, data: Record<string, unknown>) => api.put(`/invoices/item-types/${id}/`, data),
  deleteItemType: (id: number) => api.delete(`/invoices/item-types/${id}/`),
  setItemTypeFields: (id: number, fields: Record<string, unknown>[]) => api.post(`/invoices/item-types/${id}/fields/`, { fields }),
  // Payer Balance
  payerBalance: (id: number) => api.get(`/invoices/payers/${id}/balance/`),
  // Invoices
  invoices: (params?: Record<string, string>) => api.get('/invoices/invoices/', { params }),
  invoice: (id: number) => api.get(`/invoices/invoices/${id}/`),
  createInvoice: (data: Record<string, unknown>) => api.post('/invoices/invoices/', data),
  updateInvoice: (id: number, data: Record<string, unknown>) => api.put(`/invoices/invoices/${id}/`, data),
  deleteInvoice: (id: number) => api.delete(`/invoices/invoices/${id}/`),
  addInvoiceItem: (id: number, data: Record<string, unknown>) => api.post(`/invoices/invoices/${id}/items/`, data),
  // Invoice File Generation
  generateInvoiceFiles: (id: number, format?: string) => api.get(`/invoices/invoices/${id}/generate/`, { params: format ? { format } : undefined }),
  downloadInvoiceFile: (id: number, fmt: string) => api.get(`/invoices/invoices/${id}/download/${fmt}/`, { responseType: 'blob' }),
  // Excel Import
  importExcelPreview: (formData: FormData) => api.post('/invoices/import/preview/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importExcelConfirm: (data: Record<string, unknown>) => api.post('/invoices/import/confirm/', data),
  // Letter Numbering
  reserveLetter: (payerId: number) => api.post('/invoices/letters/reserve/', { payer_id: payerId }),
  // Templates
  getActiveTemplate: () => api.get('/invoices/templates/active/'),
  saveActiveTemplate: (data: Record<string, unknown>) => api.post('/invoices/templates/save/', data),
  // Payments
  payments: (params?: Record<string, string>) => api.get('/invoices/payments/', { params }),
  createPayment: (data: Record<string, unknown>) => api.post('/invoices/payments/', data),
  deletePayment: (id: number) => api.delete(`/invoices/payments/${id}/`),
  // Debts & Credits
  debts: (params?: Record<string, string>) => api.get('/invoices/debts/', { params }),
  createDebt: (data: Record<string, unknown>) => api.post('/invoices/debts/', data),
  updateDebt: (id: number, data: Record<string, unknown>) => api.put(`/invoices/debts/${id}/`, data),
  deleteDebt: (id: number) => api.delete(`/invoices/debts/${id}/`),
  credits: (params?: Record<string, string>) => api.get('/invoices/credits/', { params }),
  createCredit: (data: Record<string, unknown>) => api.post('/invoices/credits/', data),
  deleteCredit: (id: number) => api.delete(`/invoices/credits/${id}/`),
  // Approvals
  approvals: (params?: Record<string, string>) => api.get('/invoices/approvals/', { params }),
  createApproval: (data: Record<string, unknown>) => api.post('/invoices/approvals/', data),
  approvalAction: (id: number, action: string, data?: Record<string, unknown>) => api.post(`/invoices/approvals/${id}/${action}/`, data),
  // File Templates (DOCX upload + placeholder substitution)
  fileTemplates: (params?: Record<string, string>) => api.get('/invoices/file-templates/', { params }),
  fileTemplateDetail: (id: number) => api.get(`/invoices/file-templates/${id}/`),
  createFileTemplate: (data: FormData) => api.post('/invoices/file-templates/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateFileTemplate: (id: number, data: FormData) => api.put(`/invoices/file-templates/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteFileTemplate: (id: number) => api.delete(`/invoices/file-templates/${id}/`),
  setDefaultFileTemplate: (id: number) => api.post(`/invoices/file-templates/${id}/set-default/`),
  renderFileTemplate: (id: number, data: Record<string, unknown>) => api.post(`/invoices/file-templates/${id}/render/`, data, { responseType: 'blob' }),
  // Report Templates (templates_app)
  templates: (params?: Record<string, string>) => api.get('/finance/templates/', { params }),
  templateDetail: (id: number) => api.get(`/finance/templates/${id}/`),
  createTemplate: (data: Record<string, unknown>) => api.post('/finance/templates/', data),
  updateTemplate: (id: number, data: Record<string, unknown>) => api.put(`/finance/templates/${id}/`, data),
  deleteTemplate: (id: number) => api.delete(`/finance/templates/${id}/`),
  setDefaultTemplate: (id: number) => api.post(`/finance/templates/${id}/set-default/`),
  duplicateTemplate: (id: number) => api.post(`/finance/templates/${id}/duplicate/`),
  templateDataSchema: () => api.get('/finance/templates/data-schema/'),
  templatePreview: (data: Record<string, unknown>) => api.post('/finance/templates/preview/', data),
  // Generated Files Management
  generatedFiles: (params?: Record<string, string>) => api.get('/invoices/generated-files/', { params }),
  downloadGeneratedFile: (id: number) => api.get(`/invoices/generated-files/${id}/download/`, { responseType: 'blob' }),
  softDeleteGeneratedFile: (id: number) => api.post(`/invoices/generated-files/${id}/soft-delete/`),
  cleanupGeneratedFiles: () => api.post('/invoices/generated-files/cleanup/'),
}
