import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LayoutDashboard, Users, FileText, CreditCard, AlertTriangle, CheckCircle, Settings, BookOpen, ArrowRight } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/finance', icon: LayoutDashboard, label: 'داشبورد', exact: true },
  { path: '/finance/payers', icon: Users, label: 'پرداخت‌کنندگان' },
  { path: '/finance/invoices', icon: FileText, label: 'صورت‌حساب‌ها' },
  { path: '/finance/payments', icon: CreditCard, label: 'پرداخت‌ها' },
  { path: '/finance/debts', icon: AlertTriangle, label: 'بدهی‌ها و بستانکاری' },
  { path: '/finance/approvals', icon: CheckCircle, label: 'تأییدیه‌ها' },
  { path: '/finance/templates', icon: BookOpen, label: 'قالب‌ها' },
  { path: '/finance/settings', icon: Settings, label: 'تنظیمات' },
]

export default function FinanceShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          {!collapsed && <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">مالی</h2>}
          <button onClick={() => navigate('/')} className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {!collapsed && 'انتخاب ماژول'}
          </button>
        </div>
        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive(item.path, item.exact)
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
