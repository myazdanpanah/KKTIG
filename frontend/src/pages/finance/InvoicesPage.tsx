import { useState, useEffect, useRef } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Upload, Download, FileText, ChevronDown, ChevronRight, File } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'
import JalaliDateInput from '../../components/JalaliDateInput'

interface Invoice { id: number; letter_number: string; payer_name: string; invoice_type_name: string; issue_date: string; status: string; amount: number; line_count: number }
interface Payer { id: number; name: string; code: string }
interface ItemType { id: number; name: string; code: string }
interface ImportRow { order: number; ref: string; customer_name: string; description: string; date: string; notes: string; debt: number; credit: number; balance: number }

const SC: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' }

export default function InvoicesPage() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', payer: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ payer: '', invoice_type: '', issue_date: new Date().toISOString().split('T')[0], period_range: '' })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<number, unknown[]>>({})

  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importFileType, setImportFileType] = useState('')
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null)
  const [importSummary, setImportSummary] = useState<{ total_debt: number; total_credit: number; total_balance: number; row_count: number } | null>(null)
  const [importFileTypeAuto, setImportFileTypeAuto] = useState('')
  const [importPayer, setImportPayer] = useState('')
  const [importItemType, setImportItemType] = useState('')
  const [importPeriod, setImportPeriod] = useState('')
  const [importing, setImporting] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: t('invDraft'), submitted: t('invSubmitted'), approved: t('invApproved'), rejected: t('invRejected') }
    return map[s] || s
  }

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filter.status) params.status = filter.status
    if (filter.payer) params.payer = filter.payer
    financeApi.invoices(params).then(r => { setInvoices(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [filter])
  useEffect(() => {
    financeApi.payers().then(r => setPayers(r.data)).catch(() => {})
    financeApi.itemTypes().then(r => setItemTypes(r.data)).catch(() => {})
  }, [])

  const handleCreate = async () => {
    try {
      await financeApi.createInvoice({ payer: Number(form.payer), invoice_type: Number(form.invoice_type), issue_date: form.issue_date, period_range: form.period_range })
      setShowForm(false)
      load()
    } catch { /* ignore */ }
  }

  const handleImportUpload = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      if (importFileType) fd.append('file_type', importFileType)
      const res = await financeApi.importExcelPreview(fd)
      setImportPreview(res.data.rows)
      setImportSummary(res.data.summary)
      setImportFileTypeAuto(res.data.file_type)
    } catch { /* ignore */ }
    setImporting(false)
  }

  const handleImportConfirm = async () => {
    if (!importPreview || !importPayer || !importItemType) return
    setImporting(true)
    try {
      await financeApi.importExcelConfirm({
        payer_id: Number(importPayer),
        item_type_id: Number(importItemType),
        issue_date: new Date().toISOString().split('T')[0],
        period_range: importPeriod,
        file_type: importFileTypeAuto,
        rows: importPreview,
      })
      setShowImport(false)
      setImportPreview(null)
      setImportSummary(null)
      setImportFile(null)
      load()
    } catch { /* ignore */ }
    setImporting(false)
  }

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!expandedItems[id]) {
      try {
        const res = await financeApi.invoice(id)
        setExpandedItems(prev => ({ ...prev, [id]: res.data.items || [] }))
      } catch { /* ignore */ }
    }
  }

  const handleGenerate = async (id: number, fmt: string) => {
    setGeneratingId(id)
    try {
      const res = await financeApi.downloadInvoiceFile(id, fmt)
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = fmt === 'excel' ? 'xlsx' : fmt === 'word' ? 'docx' : 'pdf'
      a.download = `invoice_${id}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setGeneratingId(null)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('invoicesTitle')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Upload className="w-4 h-4" /> {t('invImportExcel')}
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm">
            <Plus className="w-4 h-4" /> {t('newInvoice')}
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
          <option value="">{t('allStatus')}</option>
          <option value="draft">{t('invDraft')}</option>
          <option value="submitted">{t('invSubmitted')}</option>
          <option value="approved">{t('invApproved')}</option>
          <option value="rejected">{t('invRejected')}</option>
        </select>
        <select value={filter.payer} onChange={e => setFilter({...filter, payer: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
          <option value="">{t('allPayers')}</option>
          {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b">
            <th className="w-8"></th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invLetter')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invPayer')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invType')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invStatus')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invAmount')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('invLines')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payActions')}</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={8} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>) : invoices.length === 0 ? (<tr><td colSpan={8} className="text-center py-8 text-gray-400">{t('invNoInvoices')}</td></tr>) : invoices.map(inv => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-2 py-3">
                    <button onClick={() => toggleExpand(inv.id)} className="p-1 text-gray-400 hover:text-gray-600">
                      {expandedId === inv.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{inv.letter_number}</td>
                  <td className="px-4 py-3">{inv.payer_name}</td>
                  <td className="px-4 py-3 text-xs">{inv.invoice_type_name}</td>
                  <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full " + (SC[inv.status] || '')}>{statusLabel(inv.status)}</span></td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.line_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleGenerate(inv.id, 'excel')} disabled={generatingId === inv.id} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Excel">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleGenerate(inv.id, 'word')} disabled={generatingId === inv.id} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Word">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleGenerate(inv.id, 'pdf')} disabled={generatingId === inv.id} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="PDF">
                        <File className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
            ))}
            {expandedId && expandedItems[expandedId] && (
              <tr key="expanded-items">
                <td colSpan={8} className="bg-gray-50 dark:bg-gray-850 p-4">
                  <table className="w-full text-xs border rounded-lg overflow-hidden">
                    <thead><tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="px-3 py-2 text-right">#</th>
                      <th className="px-3 py-2 text-right">{t('invLetter')}</th>
                      <th className="px-3 py-2 text-right">{t('invPayer')}</th>
                      <th className="px-3 py-2 text-right">{t('invType')}</th>
                      <th className="px-3 py-2 text-right">{t('invAmount')}</th>
                      <th className="px-3 py-2 text-right">{t('dcAmount')}</th>
                    </tr></thead>
                    <tbody>
                      {(expandedItems[expandedId] as Record<string, unknown>[]).map((item: Record<string, unknown>, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{item.ref as string}</td>
                          <td className="px-3 py-2">{item.customer_name as string}</td>
                          <td className="px-3 py-2">{item.description as string}</td>
                          <td className="px-3 py-2 text-red-600">{formatCurrency((item.debt as number) || 0)}</td>
                          <td className="px-3 py-2 text-green-600">{formatCurrency((item.credit as number) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{t('newInvoice')}</h3>
            <div className="space-y-3">
              <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                <option value="">{t('invSelectPayer')}</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={form.invoice_type} onChange={e => setForm({...form, invoice_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                <option value="">{t('invSelectType')}</option>
                {itemTypes.map(ty => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
              </select>
              <JalaliDateInput value={form.issue_date} onChange={v => setForm({...form, issue_date: v})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              <input placeholder={t('invPeriod')} value={form.period_range} onChange={e => setForm({...form, period_range: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold">{t('invImportExcel')}</h3>
            {!importPreview ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">{t('invImportDropzone')}</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                </div>
                {importFile && <p className="text-sm text-gray-600 dark:text-gray-400">{t('invImportSelected')}: {importFile.name}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('invImportFileType')}</label>
                    <select value={importFileType} onChange={e => setImportFileType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                      <option value="">{t('invImportAutoDetect')}</option>
                      <option value="flight">{t('invFlight')}</option>
                      <option value="hotel">{t('invHotel')}</option>
                      <option value="service">{t('invService')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowImport(false); setImportPreview(null); setImportFile(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
                  <button onClick={handleImportUpload} disabled={!importFile || importing} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{importing ? t('loading') : t('invImportProcess')}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500">{t('invImportDetected')}</div>
                    <div className="font-bold text-blue-700 dark:text-blue-400">{importFileTypeAuto}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500">{t('invImportRows')}</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">{importSummary?.row_count}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500">{t('invImportBalance')}</div>
                    <div className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(importSummary?.total_balance || 0)}</div>
                  </div>
                </div>
                <div className="overflow-x-auto border rounded-lg max-h-60">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="px-2 py-1.5 text-right">#</th>
                      <th className="px-2 py-1.5 text-right">{t('invLetter')}</th>
                      <th className="px-2 py-1.5 text-right">{t('invPayer')}</th>
                      <th className="px-2 py-1.5 text-right">{t('invType')}</th>
                      <th className="px-2 py-1.5 text-right">{t('invAmount')}</th>
                      <th className="px-2 py-1.5 text-right">{t('dcAmount')}</th>
                    </tr></thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5">{row.order}</td>
                          <td className="px-2 py-1.5">{row.ref}</td>
                          <td className="px-2 py-1.5">{row.customer_name}</td>
                          <td className="px-2 py-1.5">{row.description}</td>
                          <td className="px-2 py-1.5 text-red-600">{formatCurrency(row.debt)}</td>
                          <td className="px-2 py-1.5 text-green-600">{formatCurrency(row.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 20 && <p className="text-xs text-gray-400 text-center py-2">... و {importPreview.length - 20} ردیف دیگر</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select value={importPayer} onChange={e => setImportPayer(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                    <option value="">{t('invSelectPayer')}</option>
                    {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={importItemType} onChange={e => setImportItemType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                    <option value="">{t('invSelectType')}</option>
                    {itemTypes.map(ty => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
                  </select>
                  <input placeholder={t('invPeriod')} value={importPeriod} onChange={e => setImportPeriod(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setImportPreview(null); setImportSummary(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
                  <button onClick={handleImportConfirm} disabled={!importPayer || !importItemType || importing} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{importing ? t('loading') : t('invImportConfirm')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
