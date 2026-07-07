import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { TrendingUp, TrendingDown, Users, FileText, Clock } from 'lucide-react'
import { useTranslation } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'

export default function FinanceDashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    financeApi.dashboard().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">{t('loading')}</div>
  if (!data) return <div className="p-8 text-center text-gray-400">{t('finLoadError')}</div>

  const kpis = [
    { label: t('finTotalReceivable'), value: data.total_receivable as number, icon: TrendingUp, color: 'emerald' },
    { label: t('finTotalInvoiced'), value: data.total_invoiced as number, icon: FileText, color: 'blue' },
    { label: t('finTotalPaid'), value: data.total_paid as number, icon: TrendingDown, color: 'amber' },
    { label: t('finMonthlyPaid'), value: data.monthly_paid as number, icon: TrendingUp, color: 'indigo' },
    { label: t('finTotalPayers'), value: data.total_payers as number, icon: Users, color: 'purple', isCount: true },
    { label: t('finPendingApprovals'), value: data.pending_approvals as number, icon: Clock, color: 'red', isCount: true },
  ]

  const topDebtors = (data.top_debtors as Array<Record<string, unknown>>) || []

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finDashTitle')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg bg-${kpi.color}-100 dark:bg-${kpi.color}-900/20 flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 text-${kpi.color}-600 dark:text-${kpi.color}-400`} />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {kpi.isCount ? kpi.value : formatCurrency((kpi.value as number) || 0)}
            </div>
          </div>
        ))}
      </div>
      {topDebtors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('finTopDebtors')}</h2>
          <div className="space-y-3">
            {topDebtors.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{d.name as string}</div>
                    <div className="text-xs text-gray-400">{d.code as string}</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency((d.balance as number) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
