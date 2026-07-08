import { useState, useEffect, useRef, useCallback } from 'react'
import { gregorianToJalali, jalaliToGregorian, toPersianDigits } from '../utils/jalali'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface JalaliCalendarPickerProps {
  value: string // ISO date string "YYYY-MM-DD"
  onChange: (isoDate: string) => void
  className?: string
  placeholder?: string
  id?: string
}

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function parseJalaliDate(iso: string): { jy: number; jm: number; jd: number } | null {
  if (!iso) return null
  try {
    const parts = gregorianToJalali(iso)
    const [jy, jm, jd] = parts.split('/').map(Number)
    if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null
    return { jy, jm, jd }
  } catch {
    return null
  }
}

function toISO(jy: number, jm: number, jd: number): string {
  const g = jalaliToGregorian(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`)
  return g // already YYYY-MM-DD
}

function getDaysInMonth(jy: number, jm: number): number {
  // Jalali month lengths: first 6 months = 31, next 5 = 30, Esfand depends on leap year
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  // Esfand: 29 or 30 — try converting Esfand 30, if it yields a valid ISO date then it's a leap year
  const esfand30 = jalaliToGregorian(`${jy}/12/30`)
  return /^\d{4}-\d{2}-\d{2}$/.test(esfand30) ? 30 : 29
}

function getFirstDayOfWeek(jy: number, jm: number): number {
  // Get the day of week for the 1st of the month using ISO date of the 1st
  const g = new Date(toISO(jy, jm, 1) + 'T12:00:00')
  // JS: 0=Sun, 1=Mon, ..., 6=Sat
  // Jalali week starts Saturday
  const jsDay = g.getDay() // 0=Sun
  // Map: Sun→1, Mon→2, Tue→3, Wed→4, Thu→5, Fri→6, Sat→0
  return (jsDay + 1) % 7
}

export default function JalaliCalendarPicker({ value, onChange, className = '', placeholder, id }: JalaliCalendarPickerProps) {
  const parsed = parseJalaliDate(value)
  const today = parseJalaliDate(new Date().toISOString().split('T')[0])

  const [viewMonth, setViewMonth] = useState(() => {
    if (parsed) return { jy: parsed.jy, jm: parsed.jm }
    if (today) return { jy: today.jy, jm: today.jm }
    return { jy: 1404, jm: 1 }
  })

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selectDay = useCallback((day: number) => {
    const iso = toISO(viewMonth.jy, viewMonth.jm, day)
    if (iso) {
      onChange(iso)
      setIsOpen(false)
    }
  }, [viewMonth, onChange])

  const prevMonth = () => {
    if (viewMonth.jm === 1) {
      setViewMonth({ jy: viewMonth.jy - 1, jm: 12 })
    } else {
      setViewMonth({ ...viewMonth, jm: viewMonth.jm - 1 })
    }
  }

  const nextMonth = () => {
    if (viewMonth.jm === 12) {
      setViewMonth({ jy: viewMonth.jy + 1, jm: 1 })
    } else {
      setViewMonth({ ...viewMonth, jm: viewMonth.jm + 1 })
    }
  }

  const displayValue = parsed ? `${parsed.jy}/${String(parsed.jm).padStart(2, '0')}/${String(parsed.jd).padStart(2, '0')}` : ''
  const daysInMonth = getDaysInMonth(viewMonth.jy, viewMonth.jm)
  const firstDayOffset = getFirstDayOfWeek(viewMonth.jy, viewMonth.jm)

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className || 'w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600'} text-left flex items-center justify-between gap-1`}
      >
        <span className={displayValue ? '' : 'text-gray-400'} dir="ltr">
          {displayValue ? toPersianDigits(displayValue) : (placeholder || 'انتخاب تاریخ')}
        </span>
        <span className="text-gray-400 text-xs">📅</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl p-3 w-72" dir="rtl">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {JALALI_MONTHS[viewMonth.jm - 1]} {toPersianDigits(viewMonth.jy)}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[10px] font-bold text-gray-400 py-1">{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const isToday = today && viewMonth.jy === today.jy && viewMonth.jm === today.jm && day === today.jd
              const isSelected = parsed && viewMonth.jy === parsed.jy && viewMonth.jm === parsed.jm && day === parsed.jd
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`text-xs py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold'
                      : isToday
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setViewMonth({ jy: today!.jy, jm: today!.jm })
                onChange(new Date().toISOString().split('T')[0])
                setIsOpen(false)
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              امروز
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
