import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'

interface Approval { id: number; payer_name: string; letter_number: string; status: string; requester_name: string; approved_by_name: string; created_at: string; rejection_reason: string }

export default function ApprovalsPage() {
  const { t } = useTranslation()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const statusInfo = (s: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
      pending: { label: t('approvalsPending'), color: 'bg-amber-100 text-amber-700', icon: Clock },
      approved: { label: t('approvalsApproved'), color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      rejected: { label: t('approvalsRejected'), color: 'bg-red-100 text-red-700', icon: XCircle },
    }
    return map[s] || map.pending
  }

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filter) params.status = filter
    financeApi.approvals(params).then(r => { setApprovals(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [filter])

  const handleAction = async (id: number, action: string) => {
    if (action === 'reject') {
      const reason = prompt(t('approvalsRejectPrompt'))
      if (reason === null) return
      await financeApi.approvalAction(id, 'reject', { reason })
    } else {
      await financeApi.approvalAction(id, 'approve')
    }
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('approvalsTitle')}</h1>
      <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700">
        <option value="">{t('approvalsAll')}</option>
        <option value="pending">{t('approvalsPending')}</option>
        <option value="approved">{t('approvalsApproved')}</option>
        <option value="rejected">{t('approvalsRejected')}</option>
      </select>
      <div className="space-y-3">
        {loading ? <div className="text-center py-8 text-gray-400">{t('loading')}</div>
        : approvals.length === 0 ? <div className="text-center py-8 text-gray-400">{t('payNoData')}</div>
        : approvals.map(a => {
          const s = statusInfo(a.status)
          return (
            <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{a.letter_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <div className="text-sm mt-1">{a.payer_name} • {t('approvalsRequester')} {a.requester_name}</div>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(a.id, 'approve')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700"><CheckCircle className="w-3 h-3" /> {t('approvalsApprove')}</button>
                  <button onClick={() => handleAction(a.id, 'reject')} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"><XCircle className="w-3 h-3" /> {t('approvalsReject')}</button>
                </div>
              )}
            </div>
          )
        })
        }
      </div>
    </div>
  )
}
