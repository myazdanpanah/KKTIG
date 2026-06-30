import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus } from 'lucide-react'

interface Invoice { id: number; letter_number: string; payer_name: string; invoice_type_name: string; issue_date: string; status: string; amount: number; line_count: number }
interface Payer { id: number; name: string }
interface ItemType { id: number; name: string }

function fmt(n: number) { return new Intl.NumberFormat('fa-IR').format(n) + ' IRR' }
const SC: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' }
const SL: Record<string, string> = { draft: 'DRAFT', submitted: 'SENT', approved: 'APPROVED', rejected: 'REJECTED' }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', payer: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ payer: '', invoice_type: '', issue_date: new Date().toISOString().split('T')[0], period_range: '' })
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
    } catch { alert('ERROR') }
  }
  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>
      <div className="flex gap-3">
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filter.payer} onChange={e => setFilter({...filter, payer: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
          <option value="">All Payers</option>
          {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b">
            <th className="px-4 py-3 text-right font-medium text-gray-500">Letter</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Payer</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Lines</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>) : invoices.length === 0 ? (<tr><td colSpan={6} className="text-center py-8 text-gray-400">No invoices</td></tr>) : invoices.map(inv => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{inv.letter_number}</td>
                <td className="px-4 py-3">{inv.payer_name}</td>
                <td className="px-4 py-3 text-xs">{inv.invoice_type_name}</td>
                <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full " + (SC[inv.status] || '')}>{SL[inv.status] || inv.status}</span></td>
                <td className="px-4 py-3 font-bold">{fmt(inv.amount)}</td>
                <td className="px-4 py-3 text-gray-400">{inv.line_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">New Invoice</h3>
            <div className="space-y-3">
              <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                <option value="">Select Payer</option>
                {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={form.invoice_type} onChange={e => setForm({...form, invoice_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700">
                <option value="">Select Type</option>
                {itemTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              <input placeholder="Period" value={form.period_range} onChange={e => setForm({...form, period_range: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
