/**
 * Jalali (Persian Solar Hijri) ↔ Gregorian conversion utilities.
 *
 * Uses the `jalaali` npm package for reliable bidirectional conversion.
 * All internal dates stored on the server remain Gregorian (ISO 8601).
 */

import { toGregorian, toJalaali } from 'jalaali-js'

/* ── Jalali → Gregorian ─────────────────────────────────────────── */

/** Convert a Jalali date string "YYYY/MM/DD" to a Gregorian "YYYY-MM-DD". */
export function jalaliToGregorian(jalaliStr: string): string {
  const cleaned = toEnglishDigits(jalaliStr.trim())
  const parts = cleaned.split('/')
  if (parts.length !== 3) return jalaliStr // pass-through if not jalali
  const [jy, jm, jd] = parts.map(Number)
  if (jy < 1000 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return jalaliStr
  try {
    const g = toGregorian(jy, jm, jd)
    return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
  } catch {
    return jalaliStr
  }
}

/** Convert a Gregorian Date or ISO string to Jalali "YYYY/MM/DD". */
export function gregorianToJalali(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  try {
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`
  } catch {
    return ''
  }
}

/** Convert a Gregorian Date or ISO string to Jalali "YYYY/MM/DD" with Persian digits. */
export function gregorianToJalaliFA(date: Date | string): string {
  return toPersianDigits(gregorianToJalali(date))
}

/* ── Persian ↔ English digit conversion ─────────────────────────── */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ENGLISH_DIGITS = '0123456789'

export function toPersianDigits(text: string | number): string {
  return String(text).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}

export function toEnglishDigits(text: string): string {
  let result = ''
  for (const ch of text) {
    const idx = PERSIAN_DIGITS.indexOf(ch)
    result += idx >= 0 ? ENGLISH_DIGITS[idx] : ch
  }
  return result
}

