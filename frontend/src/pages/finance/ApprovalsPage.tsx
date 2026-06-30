import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react'

interface Approval { id: number; payer_name: string; letter_number: string; status: string; requester_name: string; approved_by_name: string; created_at: string; rejection_reason: string }

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '\u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: '\u0631\u062f \u0634\u062f\u0647', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filter) params.status = filter
    financeApi.approvals(params).then(r => { setApprovals(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [filter])

  const handleAction = async (id: number, action: string) => {
    if (action === 'reject') {
      const reason = prompt('\u062f\u0644\u06cc\u0644 \u0631\u062f\u061f')
      if (reason === null) return
      await financeApi.approvalAction(id, 'reject', { reason })
    } else {
      await financeApi.approvalAction(id, 'approve')
    }
    load()
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">\u062a\u0623\u06cc\u06cc\u062f\u06cc\u0647\u200c\u0647\u0627</h1>
      <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
        <option value="">\u0647\u0645\u0647</option>
        <option value="pending">\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631</option>
        <option value="approved">\u062a\u0623\u06cc\u06cc\u062f \u0634\u062f\u0647</option>
        <option value="rejected">\u0631\u062f \u0634\u062f\u0647</option>
      </select>
      <div className="space-y-3">
        {loading ? <div className="text-center py-8 text-gray-400">\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc...</div>
        : approvals.length === 0 ? <div className="text-center py-8 text-gray-400">\u062f\u0627\u062f\u0647\u200c\u0627\u06cc \u06cc\u0627\u0641\u062a \u0646\u0634\u062f</div>
        : approvals.map(a => {
          const s = STATUS_MAP[a.status] || STATUS_MAP.pending
          return (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{a.letter_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <div className="text-sm mt-1">{a.payer_name} \u2022 \u062a\u0648\u0636\u06cc\u062d \u062a\u0648\u0633\u0637: {a.requester_name}</div>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(a.id, 'approve')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700"><CheckCircle className="w-3 h-3" /> \u062a\u0623\u06cc\u06cc\u062f</button>
                  <button onClick={() => handleAction(a.id, 'reject')} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"><XCircle className="w-3 h-3" /> \u0631\u062f</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
