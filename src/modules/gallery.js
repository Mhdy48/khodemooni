import { containTab } from './dialog-focus.js'
import { twoDigits } from './i18n.js'

export function initGallery({ gsap, reduced }) {
  const grid = document.getElementById('gallery-grid')
  const stage = document.getElementById('gallery-stage')
  const counter = document.getElementById('gallery-counter')
  const prevBtn = document.getElementById('gallery-prev')
  const nextBtn = document.getElementById('gallery-next')
  const more = document.getElementById('gallery-more')
  const slides = [[...grid.children], [...more.content.children]]
  const tiles = slides.flat()

  let index = 0
  let animating = false
  let autoTimer = null

  function updateCounter() {
    counter.textContent = `${twoDigits.format(index + 1)} / ${twoDigits.format(slides.length)}`
  }

  function render(slideIdx) {
    grid.replaceChildren(...slides[slideIdx])
    updateCounter()
  }

  function go(next, dir = 1) {
    if (animating || next === index) return
    animating = true
    const swap = () => {
      index = next
      render(index)
      if (reduced) {
        animating = false
        return
      }
      gsap.fromTo(
        grid.children,
        { opacity: 0, y: 26, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          stagger: 0.07,
          ease: 'power3.out',
          onComplete: () => {
            animating = false
          },
        }
      )
    }
    if (reduced) {
      swap()
      return
    }
    gsap.to(grid.children, {
      opacity: 0,
      y: -18 * dir,
      duration: 0.28,
      stagger: 0.04,
      ease: 'power2.in',
      onComplete: swap,
    })
  }

  const next = () => go((index + 1) % slides.length, 1)
  const prev = () => go((index - 1 + slides.length) % slides.length, -1)

  function restartAuto() {
    clearInterval(autoTimer)
    if (reduced) return
    autoTimer = setInterval(() => {
      if (!lightboxOpen && !document.hidden && !stage.contains(document.activeElement)) next()
    }, 7000)
  }

  nextBtn.addEventListener('click', () => {
    next()
    restartAuto()
  })
  prevBtn.addEventListener('click', () => {
    prev()
    restartAuto()
  })
  nextBtn.disabled = false
  prevBtn.disabled = false
  stage.addEventListener('mouseenter', () => clearInterval(autoTimer))
  stage.addEventListener('mouseleave', restartAuto)

  let touchX = null
  stage.addEventListener(
    'pointerdown',
    (e) => {
      touchX = e.clientX
    },
    { passive: true }
  )
  stage.addEventListener(
    'pointerup',
    (e) => {
      if (touchX == null) return
      const dx = e.clientX - touchX
      touchX = null
      if (Math.abs(dx) > 55) {
        dx < 0 ? next() : prev()
        restartAuto()
      }
    },
    { passive: true }
  )

  /* ---------- lightbox ---------- */
  const lightbox = document.getElementById('lightbox')
  const lbImg = document.getElementById('lightbox-img')
  const lbCap = document.getElementById('lightbox-caption')
  const lbCount = document.getElementById('lightbox-counter')
  let opener
  let lbIndex = 0
  let lightboxOpen = false

  function renderLightbox() {
    const tile = tiles[lbIndex]
    const caption = tile.getAttribute('aria-label')
    lbImg.src = tile.href
    lbImg.alt = caption
    lbCap.textContent = caption
    lbCount.textContent = `${twoDigits.format(lbIndex + 1)} / ${twoDigits.format(tiles.length)}`
  }

  function openLightbox(globalIndex) {
    opener = tiles[globalIndex]
    gsap.killTweensOf(lightbox)
    lightbox.inert = false
    lightbox.style.opacity = ''
    lbIndex = globalIndex
    lightboxOpen = true
    renderLightbox()
    lightbox.classList.remove('hidden')
    lightbox.classList.add('flex')
    document.body.style.overflow = 'hidden'
    if (!reduced) {
      gsap.fromTo('#lightbox-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(
        lbImg,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }
      )
    }
    document.getElementById('lightbox-close').focus()
  }

  function closeLightbox() {
    if (!lightboxOpen) return
    lightboxOpen = false
    lightbox.inert = true
    opener.focus({ preventScroll: true })
    document.body.style.overflow = ''
    const hide = () => {
      lightbox.classList.add('hidden')
      lightbox.classList.remove('flex')
    }
    if (reduced) hide()
    else
      gsap.to(lightbox, {
        opacity: 0,
        duration: 0.22,
        onComplete: () => {
          hide()
          gsap.set(lightbox, { opacity: 1 })
        },
      })
  }

  function lbStep(dir) {
    lbIndex = (lbIndex + dir + tiles.length) % tiles.length
    if (reduced) {
      renderLightbox()
      return
    }
    gsap.to(lbImg, {
      opacity: 0,
      x: -18 * dir,
      duration: 0.16,
      ease: 'power1.in',
      onComplete: () => {
        renderLightbox()
        gsap.fromTo(
          lbImg,
          { opacity: 0, x: 18 * dir },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        )
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
    containTab(e, lightbox)
    if (e.key === 'ArrowLeft') lbStep(1)
    if (e.key === 'ArrowRight') lbStep(-1)
  })
  tiles.forEach((tile, tileIndex) => {
    tile.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      openLightbox(tileIndex)
    })
  })
  restartAuto()
}
