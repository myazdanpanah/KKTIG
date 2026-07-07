import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../utils/i18n'
import { ArrowRight, Volume2, VolumeX, Settings, Moon, Sun, Globe, Bell, BellOff, Calendar, Hash } from 'lucide-react'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

const TIMEZONES = [
  { value: 'Asia/Tehran', label: 'Tehran (GMT+3:30)', flag: '🇮🇷' },
  { value: 'UTC', label: 'UTC (GMT+0)', flag: '🌍' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)', flag: '🇦🇪' },
  { value: 'Europe/London', label: 'London (GMT+0/+1)', flag: '🇬🇧' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { clickSounds, notifications, language, timezone, dateFormat, compactNumbers, setClickSounds, setNotifications, setLanguage, setTimezone, setDateFormat, setCompactNumbers } = useSettingsStore()
  const { dark, toggle: toggleDark } = useThemeStore()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <Settings className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{t('appearance')}</h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                {dark ? (
                  <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('darkMode')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('darkModeDesc')}</p>
                </div>
              </div>
              <Toggle enabled={dark} onToggle={toggleDark} />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{t('language')}</h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('languageLabel')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('languageDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => setLanguage('fa')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    language === 'fa'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('persian')}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    language === 'en'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('english')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{t('timezone')}</h2>

            <div className="space-y-2">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => setTimezone(tz.value)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition ${
                    timezone === tz.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl">{tz.flag}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tz.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{tz.label}</p>
                  </div>
                  {timezone === tz.value && (
                    <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Format */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{t('dateFormat')}</h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dateFormatDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => setDateFormat('gregorian')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    dateFormat === 'gregorian'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('gregorian')}
                </button>
                <button
                  onClick={() => setDateFormat('jalaali')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    dateFormat === 'jalaali'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('jalaali')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Numbers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('compactNumbers')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('compactNumbersDesc')}</p>
                </div>
              </div>
              <Toggle enabled={compactNumbers} onToggle={() => setCompactNumbers(!compactNumbers)} />
            </div>
          </div>
        </div>

        {/* Sound & Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('soundNotifications')}</h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                {clickSounds ? (
                  <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('clickSounds')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('clickSoundsDesc')}</p>
                </div>
              </div>
              <Toggle enabled={clickSounds} onToggle={() => setClickSounds(!clickSounds)} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('notifications')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('notificationsDesc')}</p>
                </div>
              </div>
              <Toggle enabled={notifications} onToggle={() => setNotifications(!notifications)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
