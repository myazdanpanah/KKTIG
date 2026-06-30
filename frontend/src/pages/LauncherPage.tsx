import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import { BarChart3, DollarSign, ArrowLeft, Settings } from 'lucide-react'

export default function LauncherPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [lastModule, setLastModule] = useState(user?.last_module || '')
  const [modules, setModules] = useState({ nexivo: true, finance: false })

  useEffect(() => {
    if (user) {
      setModules({
        nexivo: (user as Record<string, unknown>).nexivo_access !== false,
        finance: (user as Record<string, unknown>).finance_access === true,
      })
      setLastModule((user as Record<string, unknown>).last_module as string || '')
    }
  }, [user])

  const handleSelect = async (module: string) => {
    try {
      await api.put(`/auth/users/${(user as Record<string, unknown>).id}/`, { last_module: module })
    } catch { /* ignore */ }
    if (module === 'nexivo') navigate('/dashboards')
    else if (module === 'finance') navigate('/finance')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center" dir="rtl">
      <div className="max-w-2xl w-full mx-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            خوش آمدید، {user?.first_name || user?.username}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">ماژول مورد نظر را انتخاب کنید</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {modules.nexivo && (
            <button
              onClick={() => handleSelect('nexivo')}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-right"
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">نکسیو</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">داشبوردها و گزارش‌های تحلیلی</p>
              {lastModule === 'nexivo' && (
                <span className="absolute top-4 left-4 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">آخرین انتخاب</span>
              )}
            </button>
          )}
          {modules.finance && (
            <button
              onClick={() => handleSelect('finance')}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 text-right"
            >
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <DollarSign className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">مالی</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">صورت‌حساب‌ها، پرداخت‌ها، بدهی‌ها</p>
              {lastModule === 'finance' && (
                <span className="absolute top-4 left-4 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">آخرین انتخاب</span>
              )}
            </button>
          )}
        </div>
        {lastModule && (
          <div className="text-center mt-8">
            <button
              onClick={() => handleSelect(lastModule)}
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition"
            >
              ادامه
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
