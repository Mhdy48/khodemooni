import { ar, arPlaceholders } from '../locales/ar.js'
import { faDynamic } from '../locales/fa.js'

const faPlaceholders = {}

let current = localStorage.getItem('kk-lang') || 'fa'
const faSnapshot = {}

export function t(key) {
  if (current === 'ar') return ar[key] ?? faDynamic[key] ?? faSnapshot[key] ?? key
  return faDynamic[key] ?? faSnapshot[key] ?? key
}

export function getLang() { return current }

function apply(lang) {
  current = lang
  localStorage.setItem('kk-lang', lang)
  document.documentElement.lang = lang
  document.title = lang === 'ar'
    ? 'خيّاط خودموني | خياطة حسب الطلب بجودة تدوم'
    : 'خیاط خودمونی | دوخت اختصاصی با کیفیتی ماندگار'

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n
    const val = lang === 'ar' ? ar[key] : faSnapshot[key]
    if (val != null) el.innerHTML = val
  })
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh
    const val = lang === 'ar' ? arPlaceholders[key] : faPlaceholders[key]
    if (val != null) el.placeholder = val
  })
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.lang === lang)
  })
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }))
}

export function initI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    faSnapshot[el.dataset.i18n] = el.innerHTML
  })
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    faPlaceholders[el.dataset.i18nPh] = el.placeholder
  })
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang !== current) apply(btn.dataset.lang)
    })
  })
  if (current !== 'fa') apply(current)
}