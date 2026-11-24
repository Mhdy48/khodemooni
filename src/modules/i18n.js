export const language = document.documentElement.lang
export const locale = language === 'ar' ? 'ar-u-nu-arab' : 'fa-IR'
export const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
export const twoDigits = new Intl.NumberFormat(locale, {
  minimumIntegerDigits: 2,
  maximumFractionDigits: 0,
  useGrouping: false,
})
