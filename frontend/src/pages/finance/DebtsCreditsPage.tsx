import { useState, useEffect, useCallback, useMemo } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Trash2, X, Edit2, Check } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'
import JalaliDateInput from '../../components/JalaliDateInput'
import { toPersianDigits } from '../../utils/jalali'
import { formatDate } from '../../utils/formatDate'

const SERVICE_TYPES = ['ویزا', 'اتوبوس', 'قطار', 'گشت', 'تور', 'CIP', 'سایر']

interface Debt {
  id: number; payer: number; payer_name: string; description: string;
  service_type: string; amount: number; date: string; notes: string
}
interface Credit {
  id: number; payer: number; payer_name: string; amount: number;
  credit_date: string; description: string; invoice_number: string
}
interface Payer { id: number; name: string; code: string }

export default function DebtsCreditsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'debts' | 'credits'>('debts')
  const [debts, setDebts] = useState<Debt[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<Record<string, unknown>>({})

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAll, setShowAll] = useState(true)

  // Form state for new entries
  const [form, setForm] = useState({
    payer: '', description: '', service_type: SERVICE_TYPES[0],
    amount: '', date: new Date().toISOString().split('T')[0],
    notes: '', invoice_number: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([financeApi.debts(), financeApi.credits()]).then(([d, c]) => {
      setDebts(d.data); setCredits(c.data); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    financeApi.payers().then(r => setPayers(r.data)).catch(() => {})
  }, [load])

  // ── Filtered data ──────────────────────────────────────────────
  const filterByDate = <T,>(list: T[], getDate: (item: T) => string | undefined): T[] => {
    if (showAll) return list
    return list.filter(r => {
      const d = getDate(r)
      if (!d) return false
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }

  const filteredDebts = useMemo(() => filterByDate(debts, d => d.date), [debts, showAll, dateFrom, dateTo])
  const filteredCredits = useMemo(() => filterByDate(credits, c => c.credit_date), [credits, showAll, dateFrom, dateTo])

  // ── Totals (auto-calculated) ────────────────────────────────────
  const totals = useMemo(() => {
    const list = tab === 'debts' ? filteredDebts : filteredCredits
    const totalAmount = list.reduce((s, r) => s + (r.amount || 0), 0)
    return { count: list.length, totalAmount }
  }, [tab, filteredDebts, filteredCredits])

  // ── CRUD handlers ───────────────────────────────────────────────
  const handleCreate = async () => {
    if (tab === 'debts') {
      await financeApi.createDebt({
        payer: Number(form.payer), amount: Number(form.amount),
        date: form.date, description: form.description,
        service_type: form.service_type, notes: form.notes,
      })
    } else {
      await financeApi.createCredit({
        payer: Number(form.payer), amount: Number(form.amount),
        credit_date: form.date, description: form.description,
        invoice_number: form.invoice_number,
      })
    }
    setShowForm(false)
    setForm({ payer: '', description: '', service_type: SERVICE_TYPES[0], amount: '', date: new Date().toISOString().split('T')[0], notes: '', invoice_number: '' })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('payDeleteConfirm'))) return
    if (tab === 'debts') await financeApi.deleteDebt(id)
    else await financeApi.deleteCredit(id)
    load()
  }

  const startEdit = (row: Debt | Credit) => {
    setEditingId(row.id)
    setEditRow({ ...row })
  }

  const cancelEdit = () => { setEditingId(null); setEditRow({}) }

  const saveEdit = async () => {
    if (!editingId) return
    if (tab === 'debts') {
      await financeApi.updateDebt(editingId, {
        payer: editRow.payer, amount: Number(editRow.amount),
        date: editRow.date, description: editRow.description,
        service_type: editRow.service_type, notes: editRow.notes || '',
      })
    } else {
      // Credits: no update endpoint yet, just create new if needed
    }
    setEditingId(null); setEditRow({}); load()
  }

  const updateEditField = (key: string, value: unknown) => {
    setEditRow(prev => ({ ...prev, [key]: value }))
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('debtsCreditsTitle')}</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> {tab === 'debts' ? t('addDebt') : t('addCredit')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('debts')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'debts' ? 'bg-red-100 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('tabDebts')}</button>
        <button onClick={() => setTab('credits')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'credits' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('tabCredits')}</button>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm">
        <button onClick={() => setShowAll(true)} className={`px-3 py-1 rounded-lg text-xs font-medium ${showAll ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
          {t('dcShowAll')}
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-gray-500 text-xs">{t('dcFrom')}:</span>
        <JalaliDateInput value={dateFrom} onChange={v => { setDateFrom(v); setShowAll(false) }} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-28" placeholder="از تاریخ" />
        <span className="text-gray-500 text-xs">{t('dcTo')}:</span>
        <JalaliDateInput value={dateTo} onChange={v => { setDateTo(v); setShowAll(false) }} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-28" placeholder="تا تاریخ" />
        {!showAll && (dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setShowAll(true) }} className="text-xs text-red-500 hover:text-red-600">✕ {t('dcClearFilter')}</button>
        )}
      </div>

      {/* Totals bar */}
      <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 text-sm">
        <span className="text-gray-500">{t('dcTotalRows')}: <b className="text-gray-900 dark:text-white">{toPersianDigits(totals.count)}</b></span>
        <span className="text-gray-500">{t('dcTotalAmount')}: <b className={tab === 'debts' ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(totals.totalAmount)}</b></span>
      </div>

      {/* Data Table — inline editable grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        {tab === 'debts' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b text-right">
                <th className="px-3 py-3 font-medium text-gray-500 w-8">#</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcPayers')}</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcServiceType')}</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcDescription')}</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcAmount')}</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcDate')}</th>
                <th className="px-3 py-3 font-medium text-gray-500">{t('dcActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
              ) : filteredDebts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('payNoData')}</td></tr>
              ) : filteredDebts.map((d, idx) => {
                const isEditing = editingId === d.id
                return (
                  <tr key={d.id} className={`border-b last:border-0 ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <td className="px-3 py-2 text-gray-400">{toPersianDigits(idx + 1)}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select value={editRow.payer as number} onChange={e => updateEditField('payer', Number(e.target.value))} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-full">
                          {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : d.payer_name}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select value={editRow.service_type as string} onChange={e => updateEditField('service_type', e.target.value)} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-full">
                          {SERVICE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      ) : <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{d.service_type || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input value={editRow.description as string} onChange={e => updateEditField('description', e.target.value)} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-full" />
                      ) : d.description}
                    </td>
                    <td className="px-3 py-2 font-bold text-red-600">
                      {isEditing ? (
                        <input type="number" value={editRow.amount as number} onChange={e => updateEditField('amount', Number(e.target.value))} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-28 text-left" dir="ltr" />
                      ) : formatCurrency(d.amount)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {isEditing ? (
                        <JalaliDateInput value={editRow.date as string} onChange={v => updateEditField('date', v)} className="px-2 py-1 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 w-28" />
                      ) : formatDate(d.date)}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(d)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>              ) : (
                /* Credits table */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b text-right">
                      <th className="px-3 py-3 font-medium text-gray-500 w-8">#</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcPayers')}</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcAmount')}</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcDescriptionLabel')}</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcInvoiceNumber')}</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcDate')}</th>
                      <th className="px-3 py-3 font-medium text-gray-500">{t('dcActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
                    ) : filteredCredits.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t('payNoData')}</td></tr>
                    ) : filteredCredits.map((c, idx) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2 text-gray-400">{toPersianDigits(idx + 1)}</td>
                  <td className="px-3 py-2">{c.payer_name}</td>
                  <td className="px-3 py-2 font-bold text-emerald-600">{formatCurrency(c.amount)}</td>
                  <td className="px-3 py-2">{c.description}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.invoice_number}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(c.credit_date)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── New Entry Modal ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{tab === 'debts' ? t('addDebt') : t('addCredit')}</h3>
            <div className="space-y-3">
              <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                <option value="">{t('dcSelectPayer')}</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {tab === 'debts' && (
                <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                  {SERVICE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder={t('dcAmountPlaceholder')} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" dir="ltr" />
                <JalaliDateInput value={form.date} onChange={v => setForm({...form, date: v})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              </div>
              <textarea placeholder={t('dcDescriptionPlaceholder')} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" rows={2} />
              {tab === 'credits' && <input placeholder={t('dcInvoicePlaceholder')} value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
