import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from '../../utils/i18n'
import { LayoutDashboard, Users, FileText, CreditCard, AlertTriangle, CheckCircle, Settings, BookOpen, ArrowRightLeft, LogOut, X } from 'lucide-react'

export default function FinanceShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()
  const { t } = useTranslation()
  const [collapsed] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const NAV_ITEMS = [
    { path: '/finance', icon: LayoutDashboard, label: t('financeDashboard'), exact: true },
    { path: '/finance/payers', icon: Users, label: t('payers') },
    { path: '/finance/invoices', icon: FileText, label: t('invoices') },
    { path: '/finance/payments', icon: CreditCard, label: t('payments') },
    { path: '/finance/debts', icon: AlertTriangle, label: t('debts') },
    { path: '/finance/approvals', icon: CheckCircle, label: t('approvals') },
    { path: '/finance/templates', icon: BookOpen, label: t('financeTemplates') },
    { path: '/finance/settings', icon: Settings, label: t('financeSettings') },
  ]

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          {!collapsed && <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{t('financeTitle')}</h2>}
          <button
            onClick={() => navigate('/')}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-lg transition w-full"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {!collapsed && t('switchModule')}
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
        {/* Logout */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition w-full"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && t('logout')}
          </button>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-modal-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('logoutConfirmTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('logoutConfirmMsg')}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
                >
                  {t('confirmLogout')}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-3 left-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
