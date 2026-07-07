import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { TrendingUp, TrendingDown, FileText, Clock, CreditCard } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'

interface DashboardData {
  total_receivable: number
  total_invoiced: number
  total_paid: number
  monthly_invoiced: number
  monthly_paid: number
  pending_approvals: number
  total_payers: number
  total_invoices: number
  draft_invoices: number
  submitted_invoices: number
  approved_invoices: number
  rejected_invoices: number
  total_credits: number
  total_manual_debts: number
  top_debtors: Array<{ name: string; code: string; balance: number }>
  recent_invoices: Array<{ id: number; letter_number: string; payer_name: string; amount: number; status: string; issue_date: string }>
  recent_payments: Array<{ id: number; payment_code: string; payer_name: string; amount: number; date: string; tracking: string }>
  revenue_by_type: Array<{ name: string; code: string; amount: number }>
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function FinanceDashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    financeApi.dashboard().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">{t('loading')}</div>
  if (!data) return <div className="p-8 text-center text-gray-400">{t('finLoadError')}</div>

  const netReceivable = data.total_receivable - data.total_credits
  const collectionRate = data.total_invoiced > 0 ? ((data.total_paid / data.total_invoiced) * 100).toFixed(0) : '0'

  const COLOR_MAP: Record<string, { bg: string; text: string; bgDark: string; textDark: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', bgDark: 'dark:bg-emerald-900/20', textDark: 'dark:text-emerald-400' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', bgDark: 'dark:bg-blue-900/20', textDark: 'dark:text-blue-400' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', bgDark: 'dark:bg-amber-900/20', textDark: 'dark:text-amber-400' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', bgDark: 'dark:bg-indigo-900/20', textDark: 'dark:text-indigo-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', bgDark: 'dark:bg-red-900/20', textDark: 'dark:text-red-400' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', bgDark: 'dark:bg-purple-900/20', textDark: 'dark:text-purple-400' },
  }

  const kpis = [
    { label: t('finTotalReceivable'), value: netReceivable, icon: TrendingUp, color: 'emerald', sub: `${data.total_payers} ${t('finTotalPayers')}` },
    { label: t('finTotalInvoiced'), value: data.total_invoiced, icon: FileText, color: 'blue', sub: `${data.total_invoices} ${t('invoices')}` },
    { label: t('finTotalPaid'), value: data.total_paid, icon: TrendingDown, color: 'amber', sub: `${collectionRate}% ${t('finCollectionRate')}` },
    { label: t('finMonthlyPaid'), value: data.monthly_paid, icon: TrendingUp, color: 'indigo', sub: `${formatCurrency(data.monthly_invoiced)} ${t('finInvoiced')}` },
    { label: t('finPendingApprovals'), value: data.pending_approvals, icon: Clock, color: 'red', isCount: true },
    { label: t('finTotalCredits'), value: data.total_credits, icon: CreditCard, color: 'purple' },
  ]

  // Invoice status breakdown for mini chart
  const invoiceStatuses = [
    { label: t('invDraft'), count: data.draft_invoices, color: 'bg-gray-400' },
    { label: t('invSubmitted'), count: data.submitted_invoices, color: 'bg-blue-400' },
    { label: t('invApproved'), count: data.approved_invoices, color: 'bg-emerald-400' },
    { label: t('invRejected'), count: data.rejected_invoices, color: 'bg-red-400' },
  ]
  const totalStatusCount = invoiceStatuses.reduce((s, x) => s + x.count, 0)

  // Max for bar chart scaling
  const maxRevenue = Math.max(...(data.revenue_by_type.map(r => r.amount) || [1]), 1)

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: t('invDraft'), submitted: t('invSubmitted'), approved: t('invApproved'), rejected: t('invRejected') }
    return map[s] || s
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finDashTitle')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[kpi.color].bg} ${COLOR_MAP[kpi.color].bgDark} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${COLOR_MAP[kpi.color].text} ${COLOR_MAP[kpi.color].textDark}`} />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpi.isCount ? kpi.value : formatCurrency((kpi.value as number) || 0)}
            </div>
            {kpi.sub && <div className="text-xs text-gray-400 mt-1">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finInvoiceStatus')}</h2>
          <div className="space-y-3">
            {invoiceStatuses.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">{s.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className={`${s.color} h-full rounded-full transition-all`} style={{ width: totalStatusCount > 0 ? `${(s.count / totalStatusCount) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finRevenueByType')}</h2>
          {data.revenue_by_type.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">{t('finNoData')}</div>
          ) : (
            <div className="space-y-3">
              {data.revenue_by_type.map((r) => (
                <div key={r.code} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 truncate">{r.name}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(r.amount / maxRevenue) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 text-right">{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finRecentInvoices')}</h2>
          {data.recent_invoices.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">{t('finNoData')}</div>
          ) : (
            <div className="space-y-2">
              {data.recent_invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{inv.payer_name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="font-mono">{inv.letter_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || ''}`}>{statusLabel(inv.status)}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatCurrency(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finRecentPayments')}</h2>
          {data.recent_payments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">{t('finNoData')}</div>
          ) : (
            <div className="space-y-2">
              {data.recent_payments.map((pmt) => (
                <div key={pmt.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{pmt.payer_name}</div>
                    <div className="text-xs text-gray-400">{pmt.payment_code} • {pmt.date}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pmt.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Debtors */}
      {data.top_debtors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finTopDebtors')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.top_debtors.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</div>
                    <div className="text-[10px] text-gray-400">{d.code}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(d.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
