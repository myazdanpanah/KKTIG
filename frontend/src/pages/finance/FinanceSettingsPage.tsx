import { useState, useEffect } from 'react'
import { financeApi } from '../../api/finance'
import { useTranslation } from '../../utils/i18n'

export default function FinanceSettingsPage() {
  const { t } = useTranslation()
  const [itemTypes, setItemTypes] = useState<Array<{id: number; name: string; code: string; is_active: boolean}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { financeApi.itemTypes().then(r => { setItemTypes(r.data); setLoading(false) }).catch(() => setLoading(false)) }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finSettingsTitle')}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">{t('itemTypesTitle')}</h2>
        <p className="text-sm text-gray-500">{t('finActiveItemTypes')}</p>
        {loading ? <div className="text-gray-400">{t('loading')}</div>
        : itemTypes.length === 0 ? <div className="text-gray-400">{t('finNoItemTypes')}</div>
        : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {itemTypes.filter(ty => ty.is_active).map(ty => (
              <div key={ty.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${ty.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                <span className="text-sm font-medium">{ty.name}</span>
                <span className="text-xs text-gray-400 font-mono">{ty.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">{t('finReportTemplates')}</h2>
        <p className="text-sm text-gray-500">{t('finReportTemplatesDesc')}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">{t('finLetterNumbering')}</h2>
        <p className="text-sm text-gray-500">{t('finLetterFormat')}</p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 font-mono text-sm">1404/10012/00042</div>
      </div>
    </div>
  )
}
