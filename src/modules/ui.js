import { locale } from './i18n.js'

export function initUi({ gsap, reduced }) {
  // scroll progress = golden stitch seam under the floating header
  const fill = document.getElementById('nav-thread-fill')
  const needle = document.getElementById('nav-needle')
  const toTop = document.getElementById('to-top')
  let ticking = false
  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      fill.style.width = `${p * 100}%`
      needle.style.right = `${p * 100}%`
      toTop.classList.toggle('is-visible', window.scrollY > 700)
      ticking = false
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }))

  // marquee: clone chunk so the loop is seamless on wide screens
  const marquee = document.getElementById('marquee')
  const chunk = marquee.querySelector('.marquee-chunk')
  for (let i = 0; i < 3; i++) {
    const clone = chunk.cloneNode(true)
    clone.setAttribute('aria-hidden', 'true')
    marquee.appendChild(clone)
  }
  const year = new Intl.DateTimeFormat(locale, { calendar: 'persian', year: 'numeric' })
    .formatToParts().find((part) => part.type === 'year')
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
      btn.addEventListener('mouseleave', () => { xTo(0); yTo(0) })
    })
  }
}
