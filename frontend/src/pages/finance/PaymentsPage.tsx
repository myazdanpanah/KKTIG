import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus, Trash2 } from 'lucide-react'

interface Payment { id: number; payer_name: string; payment_code: string; payment_date: string; amount: number; tracking_number: string; description: string }
interface Payer { id: number; name: string; code: string }

function formatIRR(n: number) { return new Intl.NumberFormat('fa-IR').format(n) + ' \u0631\u06cc\u0627\u0644' }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ payer: '', payment_code: '', payment_date: new Date().toISOString().split('T')[0], amount: '', tracking_number: '', description: '' })

  const load = () => {
    setLoading(true)
    financeApi.payments().then(r => { setPayments(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load(); financeApi.payers().then(r => setPayers(r.data)).catch(() => {}) }, [])

  const handleSubmit = async () => {
    try {
      await financeApi.createPayment({ ...form, payer: Number(form.payer), amount: Number(form.amount) })
      setShowForm(false); load()
    } catch { alert('\u062e\u0637\u0627') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('\u0622\u06cc\u0627 \u0627\u0632 \u062d\u0630\u0641 \u0627\u0637\u0645\u06cc\u0646\u0627\u0646 \u062f\u0627\u0631\u06cc\u062f\u061f')) return
    await financeApi.deletePayment(id); load()
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">\u067e\u0631\u062f\u0627\u062e\u062a\u200c\u0647\u0627</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"><Plus className="w-4 h-4" /> \u062b\u0628\u062a \u067e\u0631\u062f\u0627\u062e\u062a</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b">
            <th className="px-4 py-3 text-right font-medium text-gray-500">\u06a9\u062f</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">\u067e\u0631\u062f\u0627\u062e\u062a\u06a9\u0646\u0646\u062f\u0647</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">\u062a\u0627\u0631\u06cc\u062e</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">\u0645\u0628\u0644\u063a</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">\u0639\u0645\u0644\u06cc\u0627\u062a</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc...</td></tr>
            : payments.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">\u062f\u0627\u062f\u0647\u200c\u0627\u06cc \u06cc\u0627\u0641\u062a \u0646\u0634\u062f</td></tr>
            : payments.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.payment_code}</td>
                <td className="px-4 py-3">{p.payer_name}</td>
                <td className="px-4 py-3 text-xs">{p.payment_date}</td>
                <td className="px-4 py-3 font-bold text-emerald-600">{formatIRR(p.amount)}</td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">\u062b\u0628\u062a \u067e\u0631\u062f\u0627\u062e\u062a</h3>
            <div className="space-y-3">
              <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700"><option value="">\u067e\u0631\u062f\u0627\u062e\u062a\u0646\u06af\u0627\u0646</option>{payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="\u06a9\u062f \u067e\u0631\u062f\u0627\u062e\u062a" value={form.payment_code} onChange={e => setForm({...form, payment_code: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
                <input type="number" placeholder="\u0645\u0628\u0644\u063a \u0628\u0647 \u0631\u06cc\u0627\u0644" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
                <input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
                <input placeholder="\u0634\u0645\u0627\u0631\u0647 \u0631\u0633\u06cc\u062f" value={form.tracking_number} onChange={e => setForm({...form, tracking_number: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              </div>
              <textarea placeholder="\u062a\u0648\u0636\u06cc\u062d\u0627\u062a" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">\u0644\u063a\u0648</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">\u0630\u062e\u06cc\u0631\u0647</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
