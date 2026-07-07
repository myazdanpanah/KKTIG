import { useState, useEffect, useRef } from 'react'
import { financeApi } from '../../api/finance'
import { Save, Eye, Code } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'

export default function TemplateEditorPage() {
  const { t } = useTranslation()
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sourceMode, setSourceMode] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    financeApi.getActiveTemplate().then(r => {
      setHtml(r.data.html || getDefaultHtml())
      setCss(r.data.css || getDefaultCss())
    }).catch(() => {
      setHtml(getDefaultHtml())
      setCss(getDefaultCss())
    })
  }, [])

  const getDefaultHtml = () => `<div class="invoice-header">صورتحساب {{ service_type }} شماره: {{ invoice_number }} تاریخ: {{ invoice_date }}</div>
<div class="box-title">مشخصات فروشنده</div>
<table class="seller-box">
  <tr><td class="label">شناسه ملی:</td><td>{{ seller.national_id }}</td></tr>
  <tr><td class="label">نام شخص حقوقی:</td><td>{{ seller.company_name }}</td></tr>
  <tr><td class="label">نشانی:</td><td>{{ seller.address }}</td></tr>
</table>
<div class="box-title">مشخصات خریدار</div>
<table class="buyer-box">
  <tr><td class="label">شناسه ملی:</td><td>{{ buyer.national_id }}</td></tr>
  <tr><td class="label">نام شخص حقوقی:</td><td>{{ buyer.name }}</td></tr>
</table>
<table class="data-table">
  <thead><tr><th>ردیف</th><th>شماره قرارداد</th><th>نام مسافر</th><th>شرح خدمات</th><th>تاریخ</th><th>توضیحات</th><th>بدهکار (ریال)</th><th>بستانکار (ریال)</th><th>مانده (ریال)</th></tr></thead>
  <tbody>
    {% for row in page.rows %}
    <tr>
      <td>{{ loop.index }}</td><td>{{ row.contract }}</td><td>{{ row.passenger }}</td>
      <td>{{ row.description }}</td><td>{{ row.date }}</td><td>{{ row.notes }}</td>
      <td>{{ row.debt|persian_number }}</td><td>{{ row.credit|persian_number }}</td><td>{{ row.balance|persian_number }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
<div class="totals-row">
  <div>جمع بدهکار: {{ grand_total_debt|persian_number }} ریال</div>
  <div>جمع بستانکار: {{ grand_total_credit|persian_number }} ریال</div>
  <div>مانده نهایی: {{ grand_total_balance|persian_number }} ریال</div>
</div>
<div class="footer">
  <div class="signature">
    {% if seller.signature_path %}<img src="file:///{{ seller.signature_path }}">{% else %}<p>................................</p>{% endif %}
    <p>{{ seller.manager_name }}<br>{{ seller.manager_position }}</p>
  </div>
  <div class="stamp">
    {% if seller.stamp_path %}<img src="file:///{{ seller.stamp_path }}">{% else %}<p>................................</p>{% endif %}
    <p>مهر شرکت</p>
  </div>
</div>`

  const getDefaultCss = () => `@page { size: A4 landscape; margin: 1cm; }
body { font-family: 'B Nazanin', Tahoma, Arial, sans-serif; font-size: 9px; line-height: 1.2; }
.invoice-header { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
.box-title { font-weight: bold; text-align: center; background-color: #e0e0e0; padding: 3px; margin: 3px 0; }
.seller-box, .buyer-box { border: 1px solid #000; border-collapse: collapse; width: 100%; margin-bottom: 6px; }
.seller-box td, .buyer-box td { border: 1px solid #000; padding: 4px; }
.seller-box .label, .buyer-box .label { font-weight: bold; background-color: #f0f0f0; width: 25%; }
.data-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 8px 0; }
.data-table th, .data-table td { border: 1px solid #000; padding: 3px; text-align: center; }
.data-table th { background-color: #f0f0f0; font-weight: bold; }
.totals-row { margin-top: 6px; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 4px; }
.footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }`

  const handleSave = async () => {
    setSaving(true)
    try {
      await financeApi.saveActiveTemplate({ html, css, settings: {} })
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML)
    }
  }

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finTemplatesTitle')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Eye className="w-4 h-4" /> {t('finTemplatePreview')}
          </button>
          <button onClick={() => setSourceMode(!sourceMode)} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Code className="w-4 h-4" /> {sourceMode ? t('finTemplateVisual') : t('finTemplateSource')}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? t('loading') : t('save')}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border">
        <button onClick={() => execCmd('bold')} className="px-2 py-1 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded">B</button>
        <button onClick={() => execCmd('italic')} className="px-2 py-1 text-sm italic hover:bg-gray-200 dark:hover:bg-gray-700 rounded">I</button>
        <button onClick={() => execCmd('underline')} className="px-2 py-1 text-sm underline hover:bg-gray-200 dark:hover:bg-gray-700 rounded">U</button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <button onClick={() => execCmd('justifyRight')} className="px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded">➡️</button>
        <button onClick={() => execCmd('justifyCenter')} className="px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded">⬜</button>
        <button onClick={() => execCmd('justifyLeft')} className="px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded">⬅️</button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <select onChange={e => execCmd('fontName', e.target.value)} className="px-2 py-1 text-sm border rounded dark:bg-gray-700">
          <option value="B Nazanin">B Nazanin</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Arial">Arial</option>
        </select>
        <select onChange={e => execCmd('fontSize', e.target.value)} className="px-2 py-1 text-sm border rounded dark:bg-gray-700">
          <option value="2">کوچک</option>
          <option value="3">معمولی</option>
          <option value="4">بزرگ</option>
        </select>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <button onClick={() => execCmd('removeFormat')} className="px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded">🧹</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="border rounded-xl overflow-hidden dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 border-b dark:border-gray-700">
            {t('finTemplateHtmlContent')}
          </div>
          {sourceMode ? (
            <textarea
              ref={textareaRef}
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="w-full h-96 p-4 font-mono text-xs bg-white dark:bg-gray-900 dark:text-gray-200 border-none outline-none resize-y"
              dir="ltr"
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              dangerouslySetInnerHTML={{ __html: html }}
              className="h-96 p-4 overflow-y-auto bg-white dark:bg-gray-900 outline-none text-sm"
              dir="rtl"
              style={{ fontFamily: "'B Nazanin', Tahoma" }}
            />
          )}
        </div>

        {/* CSS Editor */}
        <div className="border rounded-xl overflow-hidden dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 border-b dark:border-gray-700">
            {t('finTemplateCssContent')}
          </div>
          <textarea
            value={css}
            onChange={e => setCss(e.target.value)}
            className="w-full h-96 p-4 font-mono text-xs bg-white dark:bg-gray-900 dark:text-gray-200 border-none outline-none resize-y"
            dir="ltr"
          />
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border rounded-xl overflow-hidden dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 border-b dark:border-gray-700 flex items-center justify-between">
            <span>{t('finTemplatePreview')}</span>
            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <iframe
            srcDoc={`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><style>${css}</style></head><body>${html}</body></html>`}
            className="w-full h-96 bg-white"
            title="Preview"
          />
        </div>
      )}

      {/* Variable Reference */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300">
        <h4 className="font-bold mb-2">{t('finTemplateVariables')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <code>{'{{ seller.company_name }}'}</code>
          <code>{'{{ seller.national_id }}'}</code>
          <code>{'{{ buyer.name }}'}</code>
          <code>{'{{ buyer.national_id }}'}</code>
          <code>{'{{ invoice_number }}'}</code>
          <code>{'{{ invoice_date }}'}</code>
          <code>{'{{ service_type }}'}</code>
          <code>{'{{ grand_total_debt|persian_number }}'}</code>
          <code>{'{% for row in page.rows %}'}</code>
          <code>{'{{ row.debt|persian_number }}'}</code>
          <code>{'{{ seller.manager_name }}'}</code>
          <code>{'{{ seller.manager_position }}'}</code>
        </div>
      </div>
    </div>
  )
}
