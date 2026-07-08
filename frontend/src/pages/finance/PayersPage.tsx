import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, Building2 } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'

interface Payer {
  id: number; code: string; name: string; customer_type: string;
  national_id: string; economic_code: string; registration_number: string;
  address: string; postal_code: string; phone: string; mobile: string; email: string;
  parent: number | null; balance: number; children_count: number; is_active: boolean
}

const emptyForm = {
  code: '', name: '', customer_type: 'legal', national_id: '', economic_code: '',
  registration_number: '', address: '', postal_code: '', phone: '', mobile: '',
  email: '', parent: '' as string,
}

export default function PayersPage() {
  const { t } = useTranslation()
  const [payers, setPayers] = useState<Payer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPayer, setEditPayer] = useState<Payer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [balanceDetail, setBalanceDetail] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search) params.search = search
    financeApi.payers(params).then(r => { setPayers(r.data); setLoading(false) }).catch(() => { setLoading(false); setError('خطا در بارگذاری لیست پرداخت‌کنندگان.'); setTimeout(() => setError(null), 5000) })
  }
  useEffect(load, [search])

  const handleSubmit = async () => {
    try {
      const data: Record<string, unknown> = { ...form, parent: form.parent ? Number(form.parent) : null }
      if (editPayer) { await financeApi.updatePayer(editPayer.id, data) }
      else { await financeApi.createPayer(data) }
      setShowForm(false); setEditPayer(null); load()
    } catch { alert(t('payersSaveError')) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('payersDeleteConfirm'))) return
    try { await financeApi.deletePayer(id); load() } catch { setError('خطا در حذف پرداخت‌کننده.'); setTimeout(() => setError(null), 5000) }
  }

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setBalanceDetail(null); return }
    setExpandedId(id)
    try { const res = await financeApi.payerBalance(id); setBalanceDetail(res.data) } catch { setError('خطا در دریافت جزئیات مانده.'); setTimeout(() => setError(null), 5000) }
  }

  const startEdit = (p: Payer) => {
    setEditPayer(p)
    setForm({
      code: p.code, name: p.name, customer_type: p.customer_type,
      national_id: p.national_id || '', economic_code: p.economic_code || '',
      registration_number: p.registration_number || '', address: p.address || '',
      postal_code: p.postal_code || '', phone: p.phone || '',
      mobile: p.mobile || '', email: p.email || '',
      parent: p.parent ? String(p.parent) : '',
    })
    setShowForm(true)
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('payersTitle')}</h1>
        <button onClick={() => { setShowForm(true); setEditPayer(null); setForm(emptyForm) }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm">
          <Plus className="w-4 h-4" /> {t('payersAdd')}
        </button>
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('payersSearch')} className="w-full pr-10 pl-4 py-2.5 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-700 border-b text-right">
            <th className="w-8"></th>
            <th className="px-4 py-3 font-medium text-gray-500">{t('payersCode')}</th>
            <th className="px-4 py-3 font-medium text-gray-500">{t('payersName')}</th>
            <th className="px-4 py-3 font-medium text-gray-500">{t('payersType')}</th>
            <th className="px-4 py-3 font-medium text-gray-500">{t('payersBalance')}</th>
            <th className="px-4 py-3 font-medium text-gray-500">{t('payersActions')}</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
            : payers.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('payNoData')}</td></tr>
            : payers.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-2 py-3">
                  <button onClick={() => toggleExpand(p.id)} className="p-1 text-gray-400 hover:text-gray-600">
                    {expandedId === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.customer_type === 'legal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{p.customer_type === 'legal' ? t('payersLegal') : t('payersNatural')}</span></td>
                <td className={`px-4 py-3 font-bold ${p.balance > 0 ? 'text-red-600' : p.balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{formatCurrency(p.balance)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(p)} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {expandedId && balanceDetail && (
              <tr><td colSpan={6} className="bg-gray-50 dark:bg-gray-800 p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: t('payersInvoicesTotal'), value: (balanceDetail.invoices_total as number) || 0, color: 'blue' },
                    { label: t('payersPaymentsTotal'), value: (balanceDetail.payments_total as number) || 0, color: 'emerald' },
                    { label: t('payersDebtsTotal'), value: (balanceDetail.manual_debts_total as number) || 0, color: 'red' },
                    { label: t('payersCreditsTotal'), value: (balanceDetail.credits_total as number) || 0, color: 'amber' },
                    { label: t('payersBalance'), value: (balanceDetail.balance as number) || 0, color: ((balanceDetail.balance as number) || 0) > 0 ? 'red' : 'emerald' },
                  ].map((item, i) => (
                    <div key={i} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-lg p-3 text-center`}>
                      <div className="text-xs text-gray-500">{item.label}</div>
                      <div className={`font-bold text-${item.color}-700 dark:text-${item.color}-400`}>{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">{error} <button onClick={() => setError(null)} className="mr-2">✕</button></div>
      )}

      {/* ── Full Payer Form (matching original desktop app) ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {editPayer ? t('payersEdit') : t('payersCreate')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Column 1 – Identity */}
              <div className="space-y-3">
                <input placeholder={t('payersPlaceholderCode')} value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
                <input placeholder={t('payersPlaceholderName')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
                <select value={form.customer_type} onChange={e => setForm({...form, customer_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600">
                  <option value="legal">{t('payersLegal')}</option>
                  <option value="natural">{t('payersNatural')}</option>
                </select>
                <select value={form.parent} onChange={e => setForm({...form, parent: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600">
                  <option value="">{t('payersCreate')} — بدون مادر</option>
                  {payers.filter(p => p.id !== editPayer?.id).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <input placeholder="کد ملی" value={form.national_id} onChange={e => setForm({...form, national_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
                <input placeholder="کد اقتصادی" value={form.economic_code} onChange={e => setForm({...form, economic_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
                <input placeholder="شماره ثبت" value={form.registration_number} onChange={e => setForm({...form, registration_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              {/* Column 2 – Contact */}
              <div className="space-y-3">
                <input placeholder="آدرس" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
                <input placeholder="کد پستی" value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" dir="ltr" />
                <input placeholder={t('payersPlaceholderPhone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" dir="ltr" />
                <input placeholder={t('payersPlaceholderMobile')} value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" dir="ltr" />
                <input placeholder={t('payersPlaceholderEmail')} value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" dir="ltr" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditPayer(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
