import { language } from './i18n.js'

const KEY = 'kk-scroll-y:' + language

// Restore before entrance guards run, then correct loading-related layout shifts.
export function initScrollRestore() {
  history.scrollRestoration = 'manual'

  const anchor = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))
  if (anchor) {
    const land = () => anchor.scrollIntoView({ behavior: 'instant', block: 'start' })
    land()
    addEventListener('load', land, { once: true })
  } else {
    const saved = Number(sessionStorage.getItem(KEY) || 0)
    if (saved > 0) {
      const land = () => window.scrollTo({ top: saved, behavior: 'instant' })
      land()
      addEventListener('load', land, { once: true })
    }
  }

  let queued = false
  const save = () => {
    queued = false
    sessionStorage.setItem(KEY, String(Math.round(window.scrollY)))
  }
  addEventListener('scroll', () => {
    if (queued) return
    queued = true
    requestAnimationFrame(save)
  }, { passive: true })
  addEventListener('pagehide', save)
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })
}
