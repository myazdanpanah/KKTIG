import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslation } from '../utils/i18n'
import api from '../api/client'
import { BarChart3, DollarSign, ArrowLeft, LogOut, X, Zap, Settings } from 'lucide-react'
import LanguageSwitcher from '../components/LanguageSwitcher'

const MODULE_LIST = ['nexivo', 'finance', 'logout'] as const

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SkeletonCard({ delay }: { delay: string }) {
  return (
    <div
      style={{ animationDelay: delay }}
      className="animate-card-in bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700"
    >
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 animate-pulse" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-3/4 animate-pulse" />
    </div>
  )
}

function LauncherSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-8 h-8 text-indigo-400 dark:text-indigo-500 animate-bounce-in" />
          </div>
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-64 mx-auto mb-3 animate-pulse" />
          <div className="h-5 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-48 mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: cardCount }, (_, i) => (
            <SkeletonCard key={i} delay={`${0.1 * (i + 1)}s`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LauncherPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [lastModule, setLastModule] = useState((user?.last_module as string) || '')
  const [selected, setSelected] = useState('')
  const [modules, setModules] = useState({ nexivo: true, finance: false })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const { toast } = useToast()
  const clickSoundsEnabled = useSettingsStore((s) => s.clickSounds)
  const { t } = useTranslation()

  const playClick = useCallback(() => {
    if (!clickSoundsEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
      setTimeout(() => ctx.close(), 150)
    } catch { /* audio not available */ }
  }, [clickSoundsEnabled])

  const availableModules = useMemo(
    () =>
      MODULE_LIST.filter((m) => {
        if (m === 'logout') return true
        return modules[m as keyof typeof modules]
      }),
    [modules]
  )

  useEffect(() => {
    if (user) {
      const isAdmin = user.role === 'admin' || user.role === 'ceo' || user.isStaff
      setModules({
        nexivo: isAdmin || user.nexivo_access !== false,
        finance: isAdmin || user.finance_access === true,
      })
      setLastModule(user.last_module as string || '')
      requestAnimationFrame(() => setReady(true))
    }
  }, [user])

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false)
    logout()
    navigate('/login')
  }, [logout, navigate])

  const handleConfirm = useCallback(async () => {
    if (!selected || loading) return

    if (selected === 'logout') {
      setShowLogoutConfirm(true)
      return
    }

    setLoading(true)
    try {
      await api.put('/auth/profile/update/', { last_module: selected })
    } catch {
      toast(t('saveError'), 'error')
      setLoading(false)
      return
    }
    setNavigating(true)
    setTimeout(() => {
      if (selected === 'nexivo') navigate('/dashboards')
      else if (selected === 'finance') navigate('/finance')
    }, 200)
  }, [selected, loading, navigate, toast, t])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showLogoutConfirm) {
        if (e.key === 'Escape') {
          setShowLogoutConfirm(false)
        } else if (e.key === 'Enter') {
          handleLogout()
        }
        return
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const currentIdx = availableModules.indexOf(selected as typeof MODULE_LIST[number])
        let nextIdx: number
        if (e.key === 'ArrowRight') {
          nextIdx = currentIdx <= 0 ? availableModules.length - 1 : currentIdx - 1
        } else {
          nextIdx = currentIdx >= availableModules.length - 1 ? 0 : currentIdx + 1
        }
        setSelected(availableModules[nextIdx])
      } else if (e.key === 'Enter' && selected) {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Escape') {
        setSelected('')
      }
    },
    [selected, availableModules, showLogoutConfirm, handleConfirm, handleLogout]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!user || !ready) {
    const skeletonCount = 1 + (modules.nexivo ? 1 : 0) + (modules.finance ? 1 : 0)
    return <LauncherSkeleton cardCount={skeletonCount} />
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center transition-opacity duration-200 ${navigating ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
      <div className="max-w-2xl w-full mx-4">
        <div className="text-center mb-10">
          <div className="absolute top-6 left-6 flex items-center gap-2 animate-fade-in">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/settings')}
              className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-xl transition"
              title={t('settings')}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <h1 className={`text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-all duration-500 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('welcome')}، {user?.first_name || user?.username}
          </h1>
          <p className={`text-gray-500 dark:text-gray-400 transition-all duration-500 delay-100 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('selectModule')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="radiogroup" aria-label={t('selectModule')}>
          {modules.nexivo && (
            <button
              role="radio"
              aria-checked={selected === 'nexivo'}
              onClick={() => { playClick(); setSelected('nexivo') }}
              style={{ animationDelay: '0.1s' }}
              className={`animate-card-in group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-right ${selected === 'nexivo' ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-[1.01]'}`}
            >
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('nexivo')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('nexivoDesc')}</p>
              {lastModule === 'nexivo' && (
                <span className="absolute top-4 left-4 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full animate-fade-in">{t('lastSelection')}</span>
              )}
              {selected === 'nexivo' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center animate-bounce-in">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          )}
          {modules.finance && (
            <button
              role="radio"
              aria-checked={selected === 'finance'}
              onClick={() => { playClick(); setSelected('finance') }}
              style={{ animationDelay: '0.2s' }}
              className={`animate-card-in group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-right ${selected === 'finance' ? 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:scale-[1.01]'}`}
            >
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('finance')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('financeDesc')}</p>
              {lastModule === 'finance' && (
                <span className="absolute top-4 left-4 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full animate-fade-in">{t('lastSelection')}</span>
              )}
              {selected === 'finance' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce-in">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          )}
          <button
            role="radio"
            aria-checked={selected === 'logout'}
            onClick={() => { playClick(); setSelected('logout') }}
            style={{ animationDelay: '0.3s' }}
            className={`animate-card-in group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 text-right ${selected === 'logout' ? 'border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-800 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-500 hover:scale-[1.01]'}`}
          >
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <LogOut className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('logout')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('logoutDesc')}</p>
            {selected === 'logout' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce-in">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
          </button>
        </div>
        {selected && (
          <div className="text-center mt-8 animate-slide-up">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${selected === 'logout' ? 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 hover:shadow-lg hover:shadow-red-200 dark:hover:shadow-red-900/30' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-lg'} ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Spinner />
                  {t('loading')}
                </>
              ) : selected === 'logout' ? (
                <>
                  <LogOut className="w-4 h-4" />
                  {t('logoutBtn')}
                </>
              ) : (
                <>
                  {t('continueBtn')}
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
        {!selected && lastModule && (
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('selectModuleHint')}</p>
          </div>
        )}
        {!selected && (
          <div className="text-center mt-6 animate-fade-in">
            <p className="text-[11px] text-gray-300 dark:text-gray-600">{t('keyboardHint')}</p>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-modal-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('logoutConfirmTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('logoutConfirmMsg')}</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition">
                  {t('cancel')}
                </button>
                <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition">
                  {t('confirmLogout')}
                </button>
              </div>
            </div>
            <button onClick={() => setShowLogoutConfirm(false)} className="absolute top-3 left-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
