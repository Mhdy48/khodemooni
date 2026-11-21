import { containTab } from './dialog-focus.js'

function initLanguagePickers() {
  const pickers = [...document.querySelectorAll('.lang-picker')]

  for (const picker of pickers) {
    const trigger = picker.querySelector('summary')
    const current = picker.querySelector('[aria-current="page"]')

    picker.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !picker.open) return
      event.preventDefault()
      event.stopPropagation()
      picker.open = false
      trigger.focus({ preventScroll: true })
    })
    picker.addEventListener('focusout', (event) => {
      if (!picker.contains(event.relatedTarget)) picker.open = false
    })
    current.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      picker.open = false
      trigger.focus({ preventScroll: true })
    })
  }

  document.addEventListener('click', (event) => {
    for (const picker of pickers) {
      if (!picker.contains(event.target)) picker.open = false
    }
  })
}

export function initNav({ gsap, reduced }) {
  const navbar = document.getElementById('navbar')
  initLanguagePickers()
  if (!reduced) {
    const languageIcon = navbar.querySelector('.nav-language-icon')
    const entrance = gsap
      .timeline({ paused: true })
      .fromTo(
        navbar,
        { y: -12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.58, ease: 'power3.out', clearProps: 'transform,opacity' }
      )
      .fromTo(
        navbar.querySelectorAll('.nav-brand, .nav-links, .nav-tools'),
        { y: 5, opacity: 0.48 },
        {
          y: 0,
          opacity: 1,
          duration: 0.42,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
        0.1
      )
      .fromTo(
        languageIcon,
        { rotation: -18, scale: 0.88 },
        { rotation: 0, scale: 1, duration: 0.56, ease: 'back.out(1.4)', clearProps: 'transform' },
        0.23
      )
    if (window.__kkReady) entrance.play()
    else document.addEventListener('kk:ready', () => entrance.play(), { once: true })
  }

  const desktop = matchMedia('(min-width: 75rem)')
  const desktopLinks = [...navbar.querySelectorAll('.nav-link')]
  const mobileLinks = [...document.querySelectorAll('#mobile-menu .mobile-link')]
  const sectionLinks = [...desktopLinks, ...mobileLinks]
  const sections = desktopLinks.map((link) => {
    const hash = link.getAttribute('href')
    return { hash, target: document.querySelector(hash === '#home' ? '#hero' : hash) }
  })
  let activeHash = '#home'
  let pending = false

  function syncNav() {
    pending = false
    navbar.classList.toggle('is-scrolled', scrollY > 40)
    const readingLine = innerHeight * 0.4
    const maxScroll = document.documentElement.scrollHeight - innerHeight
    let current = sections[0]
    for (const section of sections) {
      if (section.target.getBoundingClientRect().top > readingLine) break
      current = section
    }
    if (maxScroll > 0 && scrollY >= maxScroll - 2) current = sections.at(-1)
    if (current.hash === activeHash) return
    activeHash = current.hash
    sectionLinks.forEach((link) => {
      if (link.getAttribute('href') === activeHash) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }

  function queueSync() {
    if (pending) return
    pending = true
    requestAnimationFrame(syncNav)
  }

  if (window.scrollY > 40) {
    // Paint the scrolled header immediately when a previous position is restored.
    navbar.classList.add('instant', 'is-scrolled')
    requestAnimationFrame(() => requestAnimationFrame(() => navbar.classList.remove('instant')))
  }
  syncNav()
  window.addEventListener('scroll', queueSync, { passive: true })
  window.addEventListener('resize', queueSync)
  window.addEventListener('load', queueSync, { once: true })

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
        mobileLinks,
        { x: 24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.1, ease: 'power2.out' }
      )
    }
    closeBtn.focus({ preventScroll: true })
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
    const focusTarget = desktop.matches
      ? navbar.querySelector('.nav-link[aria-current="location"]')
      : openBtn
    focusTarget?.focus({ preventScroll: true })
  }

  openBtn.addEventListener('click', openMenu)
  closeBtn.addEventListener('click', closeMenu)
  backdrop.addEventListener('click', closeMenu)
  desktop.addEventListener('change', () => {
    if (desktop.matches) closeMenu()
  })
  menu.querySelectorAll('.nav-anchor').forEach((a) => a.addEventListener('click', closeMenu))
  menu.querySelectorAll('.open-modal').forEach((b) => b.addEventListener('click', closeMenu))
  document.addEventListener('keydown', (event) => {
    if (!menuOpen) return
    if (event.key === 'Escape') closeMenu()
    containTab(event, panel)
  })
}
