"""Jalali calendar helpers and Persian digit utilities for Finance module."""

import re

PERSIAN_DIGITS = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
ENGLISH_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def to_persian_digits(text) -> str:
    """Convert English digits in text to Persian digits."""
    return str(text).translate(ENGLISH_DIGITS)


def to_english_digits(text) -> str:
    """Convert Persian/Arabic digits in text to English digits."""
    return str(text).translate(PERSIAN_DIGITS)


def gregorian_to_jalali(gy, gm, gd):
    """Convert Gregorian date to Jalali (Solar Hijri) date.
    Returns (jy, jm, jd) tuple.
    """
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    if gm > 2:
        gy2 = gy + 1
    else:
        gy2 = gy
    days = 355666 + (365 * gy) + ((gy2 + 3) // 4) - ((gy2 + 99) // 100) + ((gy2 + 399) // 400) + gd + g_d_m[gm - 1]
    jy = -1595 + (33 * (days // 12053))
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + (days // 31)
        jd = 1 + (days % 31)
    else:
        jm = 7 + ((days - 186) // 30)
        jd = 1 + ((days - 186) % 30)
    return (jy, jm, jd)


def jalali_to_gregorian(jy, jm, jd):
    """Convert Jalali (Solar Hijri) date to Gregorian date.
    Returns (gy, gm, gd) tuple.
    """
    jy += 1595
    days = -355668 + (365 * jy) + (jy // 33 * 8) + ((jy % 33 + 3) // 4) + jd
    if jm < 7:
        days += (jm - 1) * 31
    else:
        days += (jm - 7) * 30 + 6
    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        gy += 100 * ((days - 1) // 36524)
        days = (days - 1) % 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    g_d_m = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if gy % 4 == 0 and (gy % 100 != 0 or gy % 400 == 0):
        g_d_m[2] = 29
    gm = 1
    while gm < 13 and gd > g_d_m[gm]:
        gd -= g_d_m[gm]
        gm += 1
    return (gy, gm, gd)


def format_jalali_date(jy, jm, jd) -> str:
    """Format a Jalali date as a Persian string."""
    months = [
        '', 'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
        'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
    ]
    return f'{jd} {months[jm]} {jy}'


def format_jalali_short(jy, jm, jd) -> str:
    """Format as YYYY/MM/DD Jalali."""
    return f'{jy:04d}/{jm:02d}/{jd:02d}'


def parse_jalali_string(text: str) -> tuple:
    """Parse a Jalali date string like '1404/03/15' to (jy, jm, jd)."""
    text = to_english_digits(text.strip())
    parts = re.split(r'[/\-]', text)
    if len(parts) == 3:
        return (int(parts[0]), int(parts[1]), int(parts[2]))
    raise ValueError(f'Cannot parse Jalali date: {text}')


def today_jalali() -> tuple:
    """Return today's date in Jalali calendar."""
    from datetime import date
    today = date.today()
    return gregorian_to_jalali(today.year, today.month, today.day)
