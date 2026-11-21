import { getLang } from './i18n.js'
import { slides } from '../data/gallery.js'

const flat = slides.flat()
const faNum = (n) => String(n).padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

export function initGallery({ gsap, reduced }) {
  const grid = document.getElementById('gallery-grid')
  const stage = document.getElementById('gallery-stage')
  const counter = document.getElementById('gallery-counter')
  const prevBtn = document.getElementById('gallery-prev')
  const nextBtn = document.getElementById('gallery-next')

  let index = 0
  let animating = false
  let autoTimer = null

  const cap = (item) => (getLang() === 'ar' ? item.ar : item.fa)

  function tile(item, globalIndex) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `gallery-tile ${item.cls}`
    btn.setAttribute('aria-label', cap(item))
    btn.innerHTML = `
      <img src="/images/${item.src}.jpg" alt="${cap(item)}" loading="lazy" />
      <span class="tile-cap">
        <svg viewBox="0 0 24 24" class="size-3.5 shrink-0 text-thread-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
        ${cap(item)}
      </span>`
    btn.addEventListener('click', () => openLightbox(globalIndex))
    return btn
  }

  function render(slideIdx) {
    grid.innerHTML = ''
    slides[slideIdx].forEach((item, i) => {
      grid.appendChild(tile(item, slideIdx * 4 + i))
    })
    counter.textContent = `${faNum(slideIdx + 1)} / ${faNum(slides.length)}`
  }

  function go(next, dir = 1) {
    if (animating || next === index) return
    animating = true
    const swap = () => {
      index = next
      render(index)
      if (reduced) { animating = false; return }
      gsap.fromTo(grid.children,
        { opacity: 0, y: 26, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out', onComplete: () => { animating = false } })
    }
    if (reduced) { swap(); return }
    gsap.to(grid.children, { opacity: 0, y: -18 * dir, duration: 0.28, stagger: 0.04, ease: 'power2.in', onComplete: swap })
  }

  const next = () => go((index + 1) % slides.length, 1)
  const prev = () => go((index - 1 + slides.length) % slides.length, -1)

  function restartAuto() {
    clearInterval(autoTimer)
    autoTimer = setInterval(() => { if (!lightboxOpen && !document.hidden) next() }, 7000)
  }

  nextBtn.addEventListener('click', () => { next(); restartAuto() })
  prevBtn.addEventListener('click', () => { prev(); restartAuto() })
  stage.addEventListener('mouseenter', () => clearInterval(autoTimer))
  stage.addEventListener('mouseleave', restartAuto)

  let touchX = null
  stage.addEventListener('pointerdown', (e) => { touchX = e.clientX }, { passive: true })
  stage.addEventListener('pointerup', (e) => {
    if (touchX == null) return
    const dx = e.clientX - touchX
    touchX = null
    if (Math.abs(dx) > 55) { dx < 0 ? next() : prev(); restartAuto() }
  }, { passive: true })

  document.addEventListener('langchange', () => render(index))

  /* ---------- lightbox ---------- */
  const lightbox = document.getElementById('lightbox')
  const lbImg = document.getElementById('lightbox-img')
  const lbCap = document.getElementById('lightbox-caption')
  const lbCount = document.getElementById('lightbox-counter')
  let lbIndex = 0
  let lightboxOpen = false

  function renderLightbox() {
    const item = flat[lbIndex]
    lbImg.src = `/images/${item.src}.jpg`
    lbImg.alt = cap(item)
    lbCap.textContent = cap(item)
    lbCount.textContent = `${faNum(lbIndex + 1)} / ${faNum(flat.length)}`
  }

  function openLightbox(globalIndex) {
    lbIndex = globalIndex
    lightboxOpen = true
    renderLightbox()
    lightbox.classList.remove('hidden')
    lightbox.classList.add('flex')
    document.body.style.overflow = 'hidden'
    if (!reduced) {
      gsap.fromTo('#lightbox-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(lbImg, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' })
    }
    document.getElementById('lightbox-close').focus()
  }

  function closeLightbox() {
    if (!lightboxOpen) return
    lightboxOpen = false
    document.body.style.overflow = ''
    const hide = () => { lightbox.classList.add('hidden'); lightbox.classList.remove('flex') }
    if (reduced) hide()
    else gsap.to(lightbox, { opacity: 0, duration: 0.22, onComplete: () => { hide(); gsap.set(lightbox, { opacity: 1 }) } })
  }

  function lbStep(dir) {
    lbIndex = (lbIndex + dir + flat.length) % flat.length
    if (reduced) { renderLightbox(); return }
    gsap.to(lbImg, {
      opacity: 0, x: -18 * dir, duration: 0.16, ease: 'power1.in',
      onComplete: () => {
        renderLightbox()
        gsap.fromTo(lbImg, { opacity: 0, x: 18 * dir }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' })
      },
    })
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox)
  document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox)
  document.getElementById('lightbox-next').addEventListener('click', () => lbStep(1))
  document.getElementById('lightbox-prev').addEventListener('click', () => lbStep(-1))
  document.addEventListener('keydown', (e) => {
    if (!lightboxOpen) return
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') lbStep(1)
    if (e.key === 'ArrowRight') lbStep(-1)
  })
  document.addEventListener('langchange', () => { if (lightboxOpen) renderLightbox() })

  render(0)
  restartAuto()
}