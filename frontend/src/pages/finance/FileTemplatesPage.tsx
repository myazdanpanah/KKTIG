import { useState, useEffect, useRef } from 'react'
import { financeApi } from '../../api/finance'
import { useTranslation } from '../../utils/i18n'
import { Upload, FileText, Trash2, Star, StarOff, Eye, Download, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react'

interface FileTemplate {
  id: number
  name: string
  doc_kind: string
  description: string
  placeholders: string[]
  is_active: boolean
  is_default: boolean
  version: number
  has_template_file: boolean
  has_html: boolean
  created_at: string
  updated_at: string
  template_file_url?: string
  html_content?: string
  css_content?: string
}

const DOC_KINDS = [
  { value: 'invoice', label: 'صورتحساب' },
  { value: 'notice', label: 'اطلاعیه واریز' },
  { value: 'creditor', label: 'بستانکاری' },
  { value: 'letter', label: 'نامه رسمی' },
]

export default function FileTemplatesPage() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<FileTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKind, setFilterKind] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create/Edit form state
  const [formName, setFormName] = useState('')
  const [formKind, setFormKind] = useState('invoice')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formHtmlContent, setFormHtmlContent] = useState('')
  const [formCssContent, setFormCssContent] = useState('')
  const [saving, setSaving] = useState(false)

  // Render modal
  const [renderModal, setRenderModal] = useState<{ templateId: number; placeholders: string[] } | null>(null)
  const [renderData, setRenderData] = useState<Record<string, string>>({})
  const [rendering, setRendering] = useState(false)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterKind) params.doc_kind = filterKind
      const res = await financeApi.fileTemplates(params)
      setTemplates(res.data)
    } catch {
      setError(t('finLoadError'))
      setTimeout(() => setError(null), 4000)
    }
    setLoading(false)
  }

  useEffect(() => { loadTemplates() }, [filterKind])

  const filtered = templates.filter(tmpl =>
    !search || tmpl.name.includes(search) || tmpl.description.includes(search)
  )

  const openCreate = () => {
    setEditingTemplate(null)
    setFormName('')
    setFormKind('invoice')
    setFormDescription('')
    setFormFile(null)
    setFormHtmlContent('')
    setFormCssContent('')
    setShowCreateModal(true)
  }

  const openEdit = async (tmpl: FileTemplate) => {
    setEditingTemplate(tmpl)
    setFormName(tmpl.name)
    setFormKind(tmpl.doc_kind)
    setFormDescription(tmpl.description)
    setFormFile(null)
    // Load full details
    try {
      const res = await financeApi.fileTemplateDetail(tmpl.id)
      setFormHtmlContent(res.data.html_content || '')
      setFormCssContent(res.data.css_content || '')
    } catch { /* ignore */ }
    setShowCreateModal(true)
  }

  const handleSave = async () => {
    if (!formName) {      setError(t('finNameRequired')); setTimeout(() => setError(null), 3000); return }
    setSaving(true)
    try {
      if (editingTemplate) {
        const formData = new FormData()
        formData.append('name', formName)
        formData.append('description', formDescription)
        formData.append('html_content', formHtmlContent)
        formData.append('css_content', formCssContent)
        if (formFile) formData.append('template_file', formFile)
        await financeApi.updateFileTemplate(editingTemplate.id, formData)
      } else {
        const formData = new FormData()
        formData.append('name', formName)
        formData.append('doc_kind', formKind)
        formData.append('description', formDescription)
        if (formFile) formData.append('template_file', formFile)
        await financeApi.createFileTemplate(formData)
      }
      setShowCreateModal(false)
      setSuccess(editingTemplate ? t('finFileTemplateUpdated') : t('finFileTemplateCreated'))
      setTimeout(() => setSuccess(null), 3000)
      loadTemplates()
    } catch {
      setError(t('adminFormSaveError'))
      setTimeout(() => setError(null), 4000)
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('finConfirmFileDelete'))) return
    try {
      await financeApi.deleteFileTemplate(id)
      setSuccess(t('finFileTemplateDeleted'))
      setTimeout(() => setSuccess(null), 3000)
      loadTemplates()
    } catch {
      setError(t('adminFormSaveError'))
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await financeApi.setDefaultFileTemplate(id)
      setSuccess(t('finFileTemplateDefault'))
      setTimeout(() => setSuccess(null), 3000)
      loadTemplates()
    } catch {
      setError(t('adminFormSaveError'))
      setTimeout(() => setError(null), 4000)
    }
  }

  const openRender = (tmpl: FileTemplate) => {
    setRenderModal({ templateId: tmpl.id, placeholders: tmpl.placeholders || [] })
    const data: Record<string, string> = {}
    ;(tmpl.placeholders || []).forEach((p: string) => { data[p] = '' })
    setRenderData(data)
  }

  const handleRender = async () => {
    if (!renderModal) return
    setRendering(true)
    try {
      const res = await financeApi.renderFileTemplate(renderModal.templateId, { data: renderData })
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `rendered_template.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('finFileTemplateRenderError'))
      setTimeout(() => setError(null), 4000)
    }
    setRendering(false)
    setRenderModal(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('finFileTemplates')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('finFileTemplatesDesc')}</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition">
            <Plus className="w-4 h-4" /> {t('finNewTemplate')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('payersSearch')}
              className="w-full pr-9 pl-3 py-2 text-sm border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
          </div>
          <select value={filterKind} onChange={e => setFilterKind(e.target.value)}
            className="px-3 py-2 text-sm border rounded-xl dark:bg-gray-800 dark:border-gray-700">
            <option value="">همه انواع</option>
            {DOC_KINDS.map(dk => <option key={dk.value} value={dk.value}>{dk.label}</option>)}
          </select>
        </div>

        {/* Template list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('finNoTemplates')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tmpl => (
              <div key={tmpl.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}>
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{tmpl.name}</span>
                      {tmpl.is_default && <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-medium">پیش‌فرض</span>}
                      {tmpl.has_template_file && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] rounded-full">DOCX</span>}
                      {tmpl.has_html && <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] rounded-full">HTML</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {DOC_KINDS.find(d => d.value === tmpl.doc_kind)?.label || tmpl.doc_kind} · v{tmpl.version} · {tmpl.placeholders?.length || 0} پلیس‌هولدر
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!tmpl.is_default && (
                      <button onClick={e => { e.stopPropagation(); handleSetDefault(tmpl.id) }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="پیش‌فرض">
                        <Star className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {tmpl.is_default && (
                      <button className="p-1.5 text-emerald-500" title="پیش‌فرض فعال">
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); openRender(tmpl) }}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600" title="رندر">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEdit(tmpl) }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="ویرایش">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(tmpl.id) }}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {expandedId === tmpl.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
                {expandedId === tmpl.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="text-xs text-gray-500 mb-2">{tmpl.description || 'بدون توضیحات'}</div>
                    {tmpl.placeholders && tmpl.placeholders.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tmpl.placeholders.map((p: string) => (
                          <span key={p} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-full font-mono">
                            {`{{${p}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-modal-in">
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{editingTemplate ? t('finEditTemplate') : t('finNewTemplate')}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('finNewTemplate')} *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700" placeholder="نام قالب" />
              </div>
              {!editingTemplate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">نوع</label>
                  <select value={formKind} onChange={e => setFormKind(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700">
                    {DOC_KINDS.map(dk => <option key={dk.value} value={dk.value}>{dk.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('finTemplateFormDesc')}</label>
                <input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700" placeholder="توضیحات قالب" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('finTemplateFormDocx')}</label>
                <div onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 transition">
                  {formFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm">{formFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">{t('finDropDocx')}</p>
                      <p className="text-[10px] mt-1">فایل باید شامل {'{{placeholder}}'} باشد</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".docx" className="hidden"
                  onChange={e => setFormFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('finTemplateFormHtml')}</label>
                <textarea value={formHtmlContent} onChange={e => setFormHtmlContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700 h-24 font-mono text-xs" dir="ltr"
                  placeholder="<div>{{payer_name}}</div>" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('finTemplateFormCss')}</label>
                <textarea value={formCssContent} onChange={e => setFormCssContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700 h-16 font-mono text-xs" dir="ltr"
                  placeholder="body { font-family: B Nazanin; }" />
              </div>
            </div>
            <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">{t('cancel')}</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition">
                {saving ? t('loading') : (editingTemplate ? t('save') : 'ایجاد')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Modal */}
      {renderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenderModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-modal-in">
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('finRenderTemplate')}</h3>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {renderModal.placeholders.length === 0 ? (
                <p className="text-sm text-gray-500">این قالب پلیس‌هولدری ندارد</p>
              ) : (
                renderModal.placeholders.map((p: string) => (
                  <div key={p}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block font-mono">{`{{${p}}}`}</label>
                    <input value={renderData[p] || ''} onChange={e => setRenderData({ ...renderData, [p]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-700" />
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-end gap-3">
              <button onClick={() => setRenderModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
              <button onClick={handleRender} disabled={rendering}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                {rendering ? t('loading') : 'دانلود'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {error} <button onClick={() => setError(null)} className="mr-2">✕</button>
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {success}
        </div>
      )}
    </div>
  )
}
