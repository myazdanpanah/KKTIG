/**
 * Edge-case tests for Jalali (Persian Solar Hijri) ↔ Gregorian conversion utilities.
 *
 * Covers: valid conversions, boundary months/days, partial dates,
 * Persian/English digit conversion, and round-trip consistency.
 */

import { describe, it, expect } from 'vitest'
import {
  jalaliToGregorian,
  gregorianToJalali,
  gregorianToJalaliFA,
  toPersianDigits,
  toEnglishDigits,
} from './jalali'

/* ── toPersianDigits / toEnglishDigits ─────────────────────────── */

describe('toPersianDigits', () => {
  it('converts simple numbers', () => {
    expect(toPersianDigits(0)).toBe('۰')
    expect(toPersianDigits(123)).toBe('۱۲۳')
    expect(toPersianDigits(1404)).toBe('۱۴۰۴')
  })

  it('converts string numbers', () => {
    expect(toPersianDigits('2025')).toBe('۲۰۲۵')
    expect(toPersianDigits('9')).toBe('۹')
  })

  it('handles mixed text with digits', () => {
    expect(toPersianDigits('2025/07/15')).toBe('۲۰۲۵/۰۷/۱۵')
  })

  it('leaves non-digit characters unchanged', () => {
    expect(toPersianDigits('abc')).toBe('abc')
    expect(toPersianDigits('')).toBe('')
  })

  it('handles zero correctly', () => {
    expect(toPersianDigits(0)).toBe('۰')
    expect(toPersianDigits('0')).toBe('۰')
  })

  it('handles large numbers', () => {
    expect(toPersianDigits(14041231)).toBe('۱۴۰۴۱۲۳۱')
  })
})

describe('toEnglishDigits', () => {
  it('converts Persian digits to English', () => {
    expect(toEnglishDigits('۱۲۳')).toBe('123')
    expect(toEnglishDigits('۰')).toBe('0')
    expect(toEnglishDigits('۹')).toBe('9')
  })

  it('leaves English digits unchanged', () => {
    expect(toEnglishDigits('123')).toBe('123')
  })

  it('handles mixed text with Persian digits', () => {
    expect(toEnglishDigits('۱۴۰۴/۰۷/۱۵')).toBe('1404/07/15')
  })

  it('leaves non-digit characters unchanged', () => {
    expect(toEnglishDigits('abc')).toBe('abc')
  })

  it('handles empty string', () => {
    expect(toEnglishDigits('')).toBe('')
  })

  it('round-trips through Persian and back', () => {
    const original = '2025/07/15'
    const persian = toPersianDigits(original)
    const back = toEnglishDigits(persian)
    expect(back).toBe(original)
  })
})

/* ── jalaliToGregorian ─────────────────────────────────────────── */

describe('jalaliToGregorian', () => {
  it('converts 1404/01/01 (Nowruz) to 2025-03-21', () => {
    expect(jalaliToGregorian('1404/01/01')).toBe('2025-03-21')
  })

  it('converts 1404/04/15 to 2025-07-06', () => {
    expect(jalaliToGregorian('1404/04/15')).toBe('2025-07-06')
  })

  it('converts first day of each month correctly', () => {
    // Farvardin 1 = March 21 in Gregorian (for 1404)
    expect(jalaliToGregorian('1404/01/01')).toBe('2025-03-21')
    // Mehr 1 = September 23
    expect(jalaliToGregorian('1404/07/01')).toBe('2025-09-23')
    // Esfand 1 = February 19
    expect(jalaliToGregorian('1404/12/01')).toBe('2026-02-20')
  })

  it('handles Persian digits input', () => {
    expect(jalaliToGregorian('۱۴۰۴/۰۷/۱۵')).toBe('2025-10-07')
  })

  it('handles mixed Persian/English digits', () => {
    expect(jalaliToGregorian('۱۴۰۴/07/15')).toBe('2025-10-07')
  })

  it('passes through non-date strings unchanged', () => {
    expect(jalaliToGregorian('hello')).toBe('hello')
  })

  it('passes through partial dates unchanged', () => {
    expect(jalaliToGregorian('1404')).toBe('1404')
    expect(jalaliToGregorian('1404/07')).toBe('1404/07')
  })

  it('passes through invalid month (>12)', () => {
    expect(jalaliToGregorian('1404/13/01')).toBe('1404/13/01')
  })

  it('passes through invalid day (>31)', () => {
    expect(jalaliToGregorian('1404/01/32')).toBe('1404/01/32')
  })

  it('passes through month 0', () => {
    expect(jalaliToGregorian('1404/00/01')).toBe('1404/00/01')
  })

  it('passes through day 0', () => {
    expect(jalaliToGregorian('1404/01/00')).toBe('1404/01/00')
  })

  it('passes through year < 1000', () => {
    expect(jalaliToGregorian('999/01/01')).toBe('999/01/01')
  })

  it('passes through year > 1600', () => {
    expect(jalaliToGregorian('1601/01/01')).toBe('1601/01/01')
  })

  it('handles leap year Esfand 30 (leap)', () => {
    // 1403 is a leap year in Jalali — Esfand 30 exists
    const result = jalaliToGregorian('1403/12/30')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('handles year boundary: 1300/01/01', () => {
    const result = jalaliToGregorian('1300/01/01')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('handles year boundary: 1500/12/29', () => {
    const result = jalaliToGregorian('1500/12/29')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('trims whitespace', () => {
    expect(jalaliToGregorian('  1404/01/01  ')).toBe('2025-03-21')
  })
})

/* ── gregorianToJalali ─────────────────────────────────────────── */

describe('gregorianToJalali', () => {
  it('converts 2025-03-21 to 1404/01/01', () => {
    expect(gregorianToJalali('2025-03-21')).toBe('1404/01/01')
  })

  it('converts 2025-07-06 to 1404/04/15', () => {
    expect(gregorianToJalali('2025-07-06')).toBe('1404/04/15')
  })

  it('converts Date objects', () => {
    const d = new Date(2025, 2, 21) // March 21, 2025
    expect(gregorianToJalali(d)).toBe('1404/01/01')
  })

  it('returns empty string for invalid dates', () => {
    expect(gregorianToJalali('invalid')).toBe('')
    expect(gregorianToJalali('')).toBe('')
  })

  it('handles epoch date', () => {
    const result = gregorianToJalali('1970-01-01')
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })

  it('handles recent dates', () => {
    const result = gregorianToJalali('2026-07-08')
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })
})

/* ── gregorianToJalaliFA ───────────────────────────────────────── */

describe('gregorianToJalaliFA', () => {
  it('returns Persian digits', () => {
    const result = gregorianToJalaliFA('2025-03-21')
    expect(result).toBe('۱۴۰۴/۰۱/۰۱')
  })

  it('returns empty string for invalid dates', () => {
    expect(gregorianToJalaliFA('invalid')).toBe('')
  })
})

/* ── Round-trip consistency ────────────────────────────────────── */

describe('round-trip conversion', () => {
  const testDates = [
    '2025-01-01',
    '2025-03-21', // Nowruz
    '2025-06-15',
    '2025-12-31',
    '2026-01-01',
    '2024-02-29', // leap year
  ]

  for (const iso of testDates) {
    it(`round-trips ${iso} correctly`, () => {
      const jalali = gregorianToJalali(iso)
      const back = jalaliToGregorian(jalali)
      expect(back).toBe(iso)
    })
  }
})
