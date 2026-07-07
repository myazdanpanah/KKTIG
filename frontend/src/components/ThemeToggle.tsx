import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useTranslation } from '../utils/i18n'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { dark, toggle } = useThemeStore()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-xl transition ${dark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${className}`}
      title={dark ? t('themeLight') : t('themeDark')}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
