import { ar } from '../locales/ar.js'
import { fa } from '../locales/fa.js'

export const language = document.documentElement.lang === 'ar' ? 'ar' : 'fa'
export const locale = language === 'ar' ? 'ar-u-nu-arab' : 'fa-IR'
export const messages = language === 'ar' ? ar : fa

export const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
export const twoDigits = new Intl.NumberFormat(locale, {
  minimumIntegerDigits: 2,
  maximumFractionDigits: 0,
  useGrouping: false,
})
