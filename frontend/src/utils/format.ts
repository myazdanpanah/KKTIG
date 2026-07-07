import { useSettingsStore } from '../store/settingsStore'

/** Locale-aware currency formatter: FA → fa-IR digits + ریال, EN → western digits + IRR */
export function formatCurrency(n: number): string {
  const state = useSettingsStore.getState()
  const lang = state.language
  const compact = state.compactNumbers
  const options: Intl.NumberFormatOptions = compact ? { notation: 'compact', compactDisplay: 'short' } : {}
  if (lang === 'en') {
    return new Intl.NumberFormat('en-US', options).format(n) + ' IRR'
  }
  return new Intl.NumberFormat('fa-IR', options).format(n) + ' ریال'
}

/** Locale-aware number formatter */
export function formatNumber(n: number): string {
  const state = useSettingsStore.getState()
  const lang = state.language
  const compact = state.compactNumbers
  const options: Intl.NumberFormatOptions = compact ? { notation: 'compact', compactDisplay: 'short' } : {}
  if (lang === 'en') {
    return new Intl.NumberFormat('en-US', options).format(n)
  }
  return new Intl.NumberFormat('fa-IR', options).format(n)
}
