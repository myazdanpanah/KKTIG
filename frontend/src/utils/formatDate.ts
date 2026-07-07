import { format } from 'date-fns-jalali'
import { useSettingsStore } from '../store/settingsStore'

/**
 * Locale-aware date formatter:
 * - jalaali: uses date-fns-jalali to format as Persian Solar Hijri (e.g. 1403/04/17)
 * - gregorian: formats as Gregorian (e.g. 2024/07/07)
 * 
 * Optionally accepts a format pattern. Defaults to 'yyyy/MM/dd'.
 */
export function formatDate(date: Date | string, fmt?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const state = useSettingsStore.getState()
  const pattern = fmt || 'yyyy/MM/dd'
  
  if (state.dateFormat === 'jalaali') {
    try {
      return format(d, pattern)
    } catch {
      // Fallback to locale string if jalaali format fails
      return d.toLocaleDateString('fa-IR')
    }
  }
  
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2')
}

/**
 * Locale-aware date-time formatter
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const state = useSettingsStore.getState()
  
  if (state.dateFormat === 'jalaali') {
    try {
      return format(d, 'yyyy/MM/dd HH:mm')
    } catch {
      return d.toLocaleString('fa-IR')
    }
  }
  
  return d.toLocaleString('en-US', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false 
  })
}
