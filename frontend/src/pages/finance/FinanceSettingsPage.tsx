import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { Save } from 'lucide-react'

export default function FinanceSettingsPage() {
  const [itemTypes, setItemTypes] = useState<Array<{id: number; name: string; code: string; is_active: boolean}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { financeApi.itemTypes().then(r => { setItemTypes(r.data); setLoading(false) }).catch(() => setLoading(false)) }, [])

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تنظیمات مالی</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">انواع آیتم</h2>
        <p className="text-sm text-gray-500">انواع آیتم فعال برای صورتحساب‌ها:</p>
        {loading ? <div className="text-gray-400">بارگذاری...</div>
        : itemTypes.length === 0 ? <div className="text-gray-400">هنوز نوع آیتمی تعریف نشده</div>
        : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {itemTypes.filter(t => t.is_active).map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-gray-400 font-mono">{t.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">قالب‌های گزارش</h2>
        <p className="text-sm text-gray-500">قالب‌های PDF صورتحساب، اطلاعیه واریز، و بستانکاری در بخش قالب‌ها قابل مدیریت هستند.</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">شماره‌گذاری نامه</h2>
        <p className="text-sm text-gray-500">قالب شماره نامه: YYYY/CODE/NNNNN (هر پرداخت‌کننده + سال)</p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 font-mono text-sm">1404/10012/00042</div>
      </div>
    </div>
  )
}
