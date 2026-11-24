import { language } from './i18n.js'

const storageKey = () => 'kk-scroll-y:' + language

// Restore before entrance guards run, then correct loading-related layout shifts.
export function initScrollRestore() {
  let storage
  let saved = 0
  try {
    storage = window.sessionStorage
    saved = Number(storage.getItem(storageKey()))
    history.scrollRestoration = 'manual'
  } catch {
    // Use native restoration when the browser restricts session storage.
  }

  let id = location.hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    // A malformed escape can still be part of a literal element ID.
  }
  const anchor = document.getElementById(id)
  if (anchor) {
    const land = () => anchor.scrollIntoView({ behavior: 'instant', block: 'start' })
    land()
    addEventListener('load', land, { once: true })
  } else if (Number.isFinite(saved) && saved > 0) {
    const land = () => window.scrollTo({ top: saved, behavior: 'instant' })
    land()
    addEventListener('load', land, { once: true })
  }

  let queued = false
  const save = () => {
    queued = false
    try {
      storage?.setItem(storageKey(), String(Math.round(window.scrollY)))
    } catch {
      storage = null
    }
  }
  addEventListener(
    'scroll',
    () => {
      if (queued) return
      queued = true
      requestAnimationFrame(save)
    },
    { passive: true }
  )
  addEventListener('pagehide', save)
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save()
  })
}
