import { useState, useEffect, useCallback } from 'react'
import { jalaliToGregorian, gregorianToJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali'
import { useSettingsStore } from '../store/settingsStore'

interface JalaliDateInputProps {
  value: string // ISO date string "YYYY-MM-DD" (Gregorian, stored on server)
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
  id?: string
}

/**
 * Smart date input that shows Jalali (FA) or Gregorian (EN) based on user settings.
 * Always stores/returns Gregorian ISO strings ("YYYY-MM-DD") for the API.
 */
export default function JalaliDateInput({ value, onChange, placeholder, className = '', id }: JalaliDateInputProps) {
  const dateFormat = useSettingsStore((s) => s.dateFormat)
  const isJalali = dateFormat === 'jalaali'

  // Display string in Jalali when enabled
  const [displayValue, setDisplayValue] = useState(() =>
    isJalali && value ? gregorianToJalali(value) : value
  )
  const [focused, setFocused] = useState(false)

  // Sync when value prop changes externally
  useEffect(() => {
    if (!focused) {
      setDisplayValue(isJalali && value ? gregorianToJalali(value) : value)
    }
  }, [value, isJalali, focused])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (isJalali) {
        // Let user type freely; convert Persian digits on the fly
        const english = toEnglishDigits(raw)
        setDisplayValue(english)
      } else {
        setDisplayValue(raw)
        onChange(raw) // native date input gives ISO string directly
      }
    },
    [isJalali, onChange]
  )

  const handleBlur = useCallback(() => {
    setFocused(false)
    if (isJalali && displayValue) {
      const converted = jalaliToGregorian(displayValue)
      // Only update if conversion produced a valid ISO date
      if (/^\d{4}-\d{2}-\d{2}$/.test(converted)) {
        onChange(converted)
        setDisplayValue(gregorianToJalali(converted))
      } else {
        // Revert to last known good value
        setDisplayValue(value ? gregorianToJalali(value) : '')
      }
    }
  }, [isJalali, displayValue, onChange, value])

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const faPlaceholder = placeholder || '۱۴۰۴/۰۴/۱۵'

  if (!isJalali) {
    return (
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
    )
  }

  return (
    <input
      id={id}
      type="text"
      dir="ltr"
      value={toPersianDigits(displayValue)}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={faPlaceholder}
      autoComplete="off"
    />
  )
}
