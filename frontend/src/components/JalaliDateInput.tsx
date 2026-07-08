import { useSettingsStore } from '../store/settingsStore'
import { gregorianToJalali, toPersianDigits } from '../utils/jalali'
import JalaliCalendarPicker from './JalaliCalendarPicker'

interface JalaliDateInputProps {
  value: string // ISO date string "YYYY-MM-DD" (Gregorian, stored on server)
  onChange: (isoDate: string) => void
  placeholder?: string
  className?: string
  id?: string
}

/**
 * Smart date input that shows Jalali calendar picker (FA) or native date picker (EN).
 * Always stores/returns Gregorian ISO strings ("YYYY-MM-DD") for the API.
 */
export default function JalaliDateInput({ value, onChange, placeholder, className = '', id }: JalaliDateInputProps) {
  const dateFormat = useSettingsStore((s) => s.dateFormat)
  const isJalali = dateFormat === 'jalaali'

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

  const displayValue = value ? gregorianToJalali(value) : ''

  return (
    <JalaliCalendarPicker
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder || `📅 ${displayValue ? toPersianDigits(displayValue) : 'انتخاب تاریخ'}`}
      id={id}
    />
  )
}
