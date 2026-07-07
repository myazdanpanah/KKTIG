import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  clickSounds: boolean
  notifications: boolean
  language: 'fa' | 'en'
  timezone: string
  dateFormat: 'gregorian' | 'jalaali'
  compactNumbers: boolean
  setClickSounds: (enabled: boolean) => void
  setNotifications: (enabled: boolean) => void
  setLanguage: (lang: 'fa' | 'en') => void
  setTimezone: (tz: string) => void
  setDateFormat: (fmt: 'gregorian' | 'jalaali') => void
  setCompactNumbers: (compact: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      clickSounds: true,
      notifications: true,
      language: 'fa',
      timezone: 'Asia/Tehran',
      dateFormat: 'jalaali',
      compactNumbers: false,
      setClickSounds: (enabled) => set({ clickSounds: enabled }),
      setNotifications: (enabled) => set({ notifications: enabled }),
      setLanguage: (lang) => set({ language: lang }),
      setTimezone: (tz) => set({ timezone: tz }),
      setDateFormat: (fmt) => set({ dateFormat: fmt }),
      setCompactNumbers: (compact) => set({ compactNumbers: compact }),
    }),
    {
      name: 'nexivo-settings',
    }
  )
)
