import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { TrendingUp, TrendingDown, Users, FileText, AlertCircle, Clock } from 'lucide-react'

function formatIRR(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n) + ' ریال'
}

export default function FinanceDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    financeApi.dashboard().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">در حال بارگذاری...</div>
  if (!data) return <div className="p-8 text-center text-gray-400">خطا در بارگذاری</div>

  const kpis = [
    { label: 'کل مطالبات', value: data.total_receivable as number, icon: TrendingUp, color: 'emerald' },
    { label: 'کل صورتحساب', value: data.total_invoiced as number, icon: FileText, color: 'blue' },
    { label: 'کل پرداختی', value: data.total_paid as number, icon: TrendingDown, color: 'amber' },
    { label: 'پرداخت ماه', value: data.monthly_paid as number, icon: TrendingUp, color: 'indigo' },
    { label: 'تعداد پرداخت‌کنندگان', value: data.total_payers as number, icon: Users, color: 'purple', isCount: true },
    { label: 'در انتظار تأیید', value: data.pending_approvals as number, icon: Clock, color: 'red', isCount: true },
  ]

  const topDebtors = (data.top_debtors as Array<Record<string, unknown>>) || []

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">داشبورد مالی</h1>
      {/* KPI Cards */}
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
              {kpi.isCount ? kpi.value : formatIRR((kpi.value as number) || 0)}
            </div>
          </div>
        ))}
      </div>
      {/* Top Debtors */}
      {topDebtors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">بدهکاران برتر</h2>
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
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatIRR((d.balance as number) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
