import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'

interface Payer { id: number; code: string; name: string; customer_type: string; balance: number; children_count: number; is_active: boolean }

export default function PayersPage() {
  const { t } = useTranslation()
  const [payers, setPayers] = useState<Payer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPayer, setEditPayer] = useState<Payer | null>(null)
  const [form, setForm] = useState({ code: '', name: '', customer_type: 'legal', national_id: '', phone: '', mobile: '', email: '', address: '' })
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
      if (editPayer) { await financeApi.updatePayer(editPayer.id, form) }
      else { await financeApi.createPayer(form) }
      setShowForm(false); setEditPayer(null); load()
    } catch { alert(t('payersSaveError')) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('payersDeleteConfirm'))) return
    try {
      await financeApi.deletePayer(id); load()
    } catch {
      setError('خطا در حذف پرداخت‌کننده.')
      setTimeout(() => setError(null), 5000)
    }
  }

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setBalanceDetail(null); return }
    setExpandedId(id)
    try {
      const res = await financeApi.payerBalance(id)
      setBalanceDetail(res.data)
    } catch {
      setError('خطا در دریافت جزئیات مانده پرداخت‌کننده.')
      setTimeout(() => setError(null), 5000)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('payersTitle')}</h1>
        <button onClick={() => { setShowForm(true); setEditPayer(null); setForm({ code: '', name: '', customer_type: 'legal', national_id: '', phone: '', mobile: '', email: '', address: '' }) }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">
          <Plus className="w-4 h-4" /> {t('payersAdd')}
        </button>
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('payersSearch')} className="w-full pr-10 pl-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersCode')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersName')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersType')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersBalance')}</th>
            <th className="w-8"></th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersCode')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersName')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersType')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersBalance')}</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payersActions')}</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('loading')}</td></tr>
            : payers.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t('payNoData')}</td></tr>
            : payers.map(p => (
              <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-2 py-3">
                  <button onClick={() => toggleExpand(p.id)} className="p-1 text-gray-400 hover:text-gray-600">
                    {expandedId === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.customer_type === 'legal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.customer_type === 'legal' ? t('payersLegal') : t('payersNatural')}</span></td>
                <td className={`px-4 py-3 font-bold ${p.balance > 0 ? 'text-red-600' : p.balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{formatCurrency(p.balance)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditPayer(p); setForm({ code: p.code, name: p.name, customer_type: p.customer_type, national_id: '', phone: '', mobile: '', email: '', address: '' }); setShowForm(true) }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {expandedId && balanceDetail && (
              <tr key="balance-detail">
                <td colSpan={6} className="bg-gray-50 dark:bg-gray-850 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{t('payersInvoicesTotal')}</div>
                      <div className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency((balanceDetail.invoices_total as number) || 0)}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{t('payersPaymentsTotal')}</div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency((balanceDetail.payments_total as number) || 0)}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{t('payersDebtsTotal')}</div>
                      <div className="font-bold text-red-700 dark:text-red-400">{formatCurrency((balanceDetail.manual_debts_total as number) || 0)}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{t('payersCreditsTotal')}</div>
                      <div className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency((balanceDetail.credits_total as number) || 0)}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{t('payersBalance')}</div>
                      <div className={`font-bold ${((balanceDetail.balance as number) || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency((balanceDetail.balance as number) || 0)}</div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <h3 className="text-lg font-bold">{editPayer ? t('payersEdit') : t('payersCreate')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder={t('payersPlaceholderCode')} value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <input placeholder={t('payersPlaceholderName')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <select value={form.customer_type} onChange={e => setForm({...form, customer_type: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600">
                <option value="legal">{t('payersLegal')}</option>
                <option value="natural">{t('payersNatural')}</option>
              </select>
              <input placeholder={t('payersPlaceholderPhone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <input placeholder={t('payersPlaceholderMobile')} value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
              <input placeholder={t('payersPlaceholderEmail')} value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
