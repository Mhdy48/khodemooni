import { containTab } from './dialog-focus.js'
export function initNav({ gsap, reduced }) {
  const navbar = document.getElementById('navbar')
  const onScroll = () => navbar.classList.toggle('is-scrolled', window.scrollY > 40)
  if (window.scrollY > 40) {
    // restored scroll: paint the scrolled pill immediately, no transition flash
    navbar.classList.add('instant', 'is-scrolled')
    requestAnimationFrame(() => requestAnimationFrame(() => navbar.classList.remove('instant')))
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  const links = [...document.querySelectorAll('.nav-link')]
  const map = { '#home': '#hero' }
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const id = entry.target.id === 'hero' ? '#home' : `#${entry.target.id}`
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id))
      })
    },
    { rootMargin: '-40% 0px -55% 0px' }
  )
  links.forEach((l) => {
    const href = l.getAttribute('href')
    const el = document.querySelector(map[href] || href)
    if (el) spy.observe(el)
  })

  // mobile menu
  const menu = document.getElementById('mobile-menu')
  const panel = document.getElementById('mobile-menu-panel')
  const openBtn = document.getElementById('menu-open')
  const closeBtn = document.getElementById('menu-close')
  const backdrop = document.getElementById('mobile-menu-backdrop')
  let menuOpen = false

  function openMenu() {
    menuOpen = true
    gsap.killTweensOf([panel, backdrop])
    menu.inert = false
    openBtn.setAttribute('aria-expanded', 'true')
    menu.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    if (!reduced) {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(
        panel,
        { y: -28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
      )
      gsap.fromTo(
        '.mobile-link',
        { x: 24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.1, ease: 'power2.out' }
      )
    }
    closeBtn.focus()
  }
  function closeMenu() {
    if (!menuOpen) return
    menuOpen = false
    menu.inert = true
    openBtn.setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
    if (reduced) {
      menu.classList.add('hidden')
    } else {
      gsap.to(panel, { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in' })
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.25,
        onComplete: () => menu.classList.add('hidden'),
      })
    }
    openBtn.focus()
  }

  openBtn.addEventListener('click', openMenu)
  closeBtn.addEventListener('click', closeMenu)
  backdrop.addEventListener('click', closeMenu)
  menu.querySelectorAll('.nav-anchor').forEach((a) => a.addEventListener('click', closeMenu))
  menu.querySelectorAll('.open-modal').forEach((b) => b.addEventListener('click', closeMenu))
  document.addEventListener('keydown', (event) => {
    if (!menuOpen) return
    if (event.key === 'Escape') closeMenu()
    containTab(event, panel)
  })
}
