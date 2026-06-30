import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Plus } from 'lucide-react'

interface Debt { id: number; payer_name: string; description: string; amount: number; date: string }
interface Credit { id: number; payer_name: string; amount: number; credit_date: string; description: string; invoice_number: string }
interface Payer { id: number; name: string }

function formatIRR(n: number) { return new Intl.NumberFormat('fa-IR').format(n) + ' \u0631\u06cc\u0627\u0644' }

export default function DebtsCreditsPage() {
  const [tab, setTab] = useState<'debts' | 'credits'>('debts')
  const [debts, setDebts] = useState<Debt[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ payer: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], invoice_number: '' })

  const load = () => {
    setLoading(true)
    Promise.all([financeApi.debts(), financeApi.credits()]).then(([d, c]) => { setDebts(d.data); setCredits(c.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load(); financeApi.payers().then(r => setPayers(r.data)).catch(() => {}) }, [])

  const handleCreate = async () => {
    const data = { payer: Number(form.payer), amount: Number(form.amount), date: form.date, description: form.description, invoice_number: form.invoice_number }
    if (tab === 'debts') await financeApi.createDebt(data)
    else await financeApi.createCredit(data)
    setShowForm(false); load()
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">\u0628\u0647\u0633\u0641\u0637\u06cc\u200c\u0647\u0627 \u0648 \u0628\u0633\u062a\u0627\u0646\u06a9\u0627\u0631\u06cc</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /> \u062b\u0628\u062a {tab === 'debts' ? '\u0628\u0647\u0633\u0641\u0637\u06cc' : '\u0628\u0633\u062a\u0627\u0646\u06a9\u0627\u0631\u06cc'}</button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab('debts')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'debts' ? 'bg-red-100 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>بهسفطی</button>
        <button onClick={() => setTab('credits')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'credits' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>بستانکاری</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-x-auto">
        {tab === 'debts' ? (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b">
              <th className="px-4 py-3 text-right font-medium text-gray-500">پرداختنگان</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">توضیح</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">مبلغ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">تاریخ</th>
            </tr></thead>
            <tbody>
              {debts.map(d => <tr key={d.id} className="border-b last:border-0"><td className="px-4 py-3">{d.payer_name}</td><td className="px-4 py-3">{d.description}</td><td className="px-4 py-3 font-bold text-red-600">{formatIRR(d.amount)}</td><td className="px-4 py-3 text-xs">{d.date}</td></tr>)}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-800 border-b">
              <th className="px-4 py-3 text-right font-medium text-gray-500">پرداختنگان</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">مبلغ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">شروعنامه</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">شماره صورتحساب</th>
            </tr></thead>
            <tbody>
              {credits.map(c => <tr key={c.id} className="border-b last:border-0"><td className="px-4 py-3">{c.payer_name}</td><td className="px-4 py-3 font-bold text-emerald-600">{formatIRR(c.amount)}</td><td className="px-4 py-3">{c.description}</td><td className="px-4 py-3 font-mono text-xs">{c.invoice_number}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">ثبت {tab === 'debts' ? 'بهسفطی' : 'بستانکاری'}</h3>
            <div className="space-y-3">
              <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700"><option value="">پرداختنگان</option>{payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="مبلغ (ریال)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />
              </div>
              <textarea placeholder="توضیحات" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" rows={2} />
              {tab === 'credits' && <input placeholder="شماره صورتحساب" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700" />}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">لغو</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
