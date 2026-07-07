import { useSettingsStore } from '../store/settingsStore'
import { useTranslation } from '../utils/i18n'

export default function LanguageSwitcher() {
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const { t } = useTranslation()

  return (
    <button
      onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      title={language === 'fa' ? t('langSwitchToEn') : t('langSwitchToFa')}
    >
      {language === 'fa' ? '🇺🇸 EN' : '🇮🇷 FA'}
    </button>
  )
}
