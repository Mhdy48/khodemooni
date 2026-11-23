import { locale } from './i18n.js'
import { initTicker } from './ticker.js'

export function initUi({ gsap, reduced }) {
  const progressBar = document.getElementById('nav-progress')
  const toTop = document.getElementById('to-top')
  let ticking = false
  function queueScrollUpdate() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      const root = document.documentElement
      const distance = root.scrollHeight - root.clientHeight
      const position = Math.max(0, window.scrollY)
      const progress = distance > 0 ? Math.min(1, position / distance) : 0
      progressBar.style.setProperty('--scroll-progress', progress)
      toTop.classList.toggle('is-visible', position > 700)
      ticking = false
    })
  }
  window.addEventListener('scroll', queueScrollUpdate, { passive: true })
  window.addEventListener('resize', queueScrollUpdate)
  new ResizeObserver(queueScrollUpdate).observe(document.body)
  queueScrollUpdate()
  toTop.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  )

  initTicker(gsap)

  const year = new Intl.DateTimeFormat(locale, { calendar: 'persian', year: 'numeric' })
    .formatToParts()
    .find((part) => part.type === 'year')
  document.getElementById('year').textContent = year.value

  // magnetic buttons (desktop only)
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' })
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' })
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect()
        xTo((e.clientX - r.left - r.width / 2) * 0.25)
        yTo((e.clientY - r.top - r.height / 2) * 0.35)
      })
      btn.addEventListener('mouseleave', () => {
        xTo(0)
        yTo(0)
      })
    })
  }
}
