export function initHero({ gsap, reduced, enter }) {
  const hero = document.getElementById('hero')
  const swatch = hero.querySelector('.hero-swatch')
  const stage = swatch.querySelector('.hero-stage')
  const object = swatch.querySelector('.hero-object')
  const detail = hero.querySelector('.hero-detail')
  const cards = [...swatch.querySelectorAll('.hero-photo')]
  const views = swatch.querySelector('.hero-views')
  const buttons = [...views.querySelectorAll('.hero-view')]
  const playback = views.querySelector('.hero-autoplay')
  const caption = swatch.querySelector('.hero-frame-info')
  const name = caption.querySelector('.hero-frame-name')
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
  const horizontal = getComputedStyle(swatch).direction === 'rtl' ? -1 : 1
  let current = 0
  let gesture
  let reveal
  let autoplay = !motionPreference.matches
  let visible = false
  let hovered = false
  let rotationTimer

  const setZoom = (active) => {
    swatch.classList.toggle('is-detail', active)
    detail.setAttribute('aria-pressed', String(active))
  }

  const select = (index) => {
    if (current === index) return
    const previous = cards[current]
    current = index
    reveal?.cancel()
    cards.forEach((card, position) => {
      const active = position === index
      card.dataset.position = active ? 'front' : 'side'
      card.setAttribute('aria-hidden', String(!active))
      card.toggleAttribute('data-outgoing', !motionPreference.matches && card === previous)
      buttons[position].setAttribute('aria-pressed', String(active))
    })
    if (!motionPreference.matches) {
      reveal = cards[index].animate(
        [
          { opacity: 0, transform: 'scale(1.045)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 620, easing: 'cubic-bezier(0.23, 0.71, 0.24, 1)' }
      )
      reveal.onfinish = () => previous.removeAttribute('data-outgoing')
    }
    detail.setAttribute('aria-controls', buttons[index].getAttribute('aria-controls'))
    setZoom(false)
    name.textContent = buttons[index].textContent.trim()
    queueRotation()
  }
  const step = (offset) => select((current + offset + cards.length) % cards.length)
  const queueRotation = () => {
    clearTimeout(rotationTimer)
    const focused = swatch.contains(document.activeElement) && document.activeElement !== playback
    const playing =
      autoplay &&
      visible &&
      !document.hidden &&
      !hovered &&
      !gesture &&
      !focused &&
      !swatch.classList.contains('is-detail')
    name.setAttribute('aria-live', playing ? 'off' : 'polite')
    if (playing) rotationTimer = setTimeout(() => step(1), 5500)
  }
  const syncPlayback = () => {
    playback.setAttribute(
      'aria-label',
      autoplay ? playback.dataset.pauseLabel : playback.dataset.playLabel
    )
    playback.toggleAttribute('data-playing', autoplay)
    queueRotation()
  }

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.intersectionRatio >= 0.5
      queueRotation()
    },
    { threshold: 0.5 }
  )
  visibility.observe(swatch)
  document.addEventListener('visibilitychange', queueRotation)
  swatch.addEventListener('focusin', queueRotation)
  swatch.addEventListener('focusout', queueRotation)
  stage.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return
    hovered = true
    queueRotation()
  })
  stage.addEventListener('pointerleave', () => {
    hovered = false
    queueRotation()
  })
  motionPreference.addEventListener('change', (event) => {
    if (event.matches) autoplay = false
    syncPlayback()
  })
  playback.addEventListener('click', () => {
    autoplay = !autoplay
    syncPlayback()
  })
  syncPlayback()

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index))
  })
  views.querySelector('.hero-gallery-previous').addEventListener('click', () => step(-1))
  views.querySelector('.hero-gallery-next').addEventListener('click', () => step(1))

  swatch.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Escape' && swatch.classList.contains('is-detail')) {
      event.preventDefault()
      setZoom(false)
      queueRotation()
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    step((event.key === 'ArrowRight' ? 1 : -1) * horizontal)
    if (buttons.includes(event.target)) buttons[current].focus({ preventScroll: true })
  })

  stage.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return
    if (event.pointerType !== 'touch') return
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY }
    queueRotation()
  })
  stage.addEventListener('pointerup', (event) => {
    if (gesture?.id !== event.pointerId) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    gesture = undefined
    queueRotation()
    if (Math.abs(dx) < Math.max(40, Math.abs(dy) * 1.3)) return
    step(-Math.sign(dx) * horizontal)
  })
  stage.addEventListener('pointercancel', () => {
    gesture = undefined
    queueRotation()
  })

  views.hidden = false
  caption.hidden = false
  detail.hidden = false
  detail.addEventListener('click', () => {
    setZoom(!swatch.classList.contains('is-detail'))
    queueRotation()
  })

  if (reduced) return

  const tiltEnabled = matchMedia('(any-hover: hover) and (prefers-reduced-motion: no-preference)')
  let frame = 0
  let bounds
  let pointer

  const resetBounds = () => {
    bounds = undefined
  }
  window.addEventListener('scroll', resetBounds, { passive: true })
  window.addEventListener('resize', resetBounds, { passive: true })

  const resetTilt = () => {
    cancelAnimationFrame(frame)
    frame = 0
    resetBounds()
    for (const key of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) {
      stage.style.removeProperty(key)
    }
  }

  stage.addEventListener('pointermove', (event) => {
    if (!tiltEnabled.matches || event.pointerType === 'touch') return
    pointer = event
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      bounds ??= swatch.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (pointer.clientX - bounds.left) / bounds.width))
      const y = Math.max(0, Math.min(1, (pointer.clientY - bounds.top) / bounds.height))
      stage.style.setProperty('--tilt-x', (0.5 - y) * 7 + 'deg')
      stage.style.setProperty('--tilt-y', (x - 0.5) * 11 + 'deg')
      stage.style.setProperty('--light-x', (x - 0.5) * 100 + '%')
      stage.style.setProperty('--light-y', (y - 0.5) * 100 + '%')
    })
  })
  stage.addEventListener('pointerleave', resetTilt)
  stage.addEventListener('pointercancel', resetTilt)
  tiltEnabled.addEventListener('change', resetTilt)

  const title = hero.querySelectorAll('.piece')
  const accent = hero.querySelector('.hero-title-accent')
  const copy = hero.querySelectorAll('.hero-in')
  gsap.set(object, { clipPath: 'inset(0 0 100% 0)' })
  gsap.set(title, { x: (index) => (index === 0 ? 18 : -18), opacity: 0 })
  gsap.set(accent, { '--hero-underline': 0 })
  gsap.set(copy, { y: 12, opacity: 0 })

  const entrance = gsap
    .timeline({ paused: true, defaults: { ease: 'power3.out' } })
    .to(object, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.76,
      clearProps: 'clipPath',
    })
    .to(
      title,
      { x: 0, opacity: 1, duration: 0.72, stagger: 0.13, clearProps: 'transform,opacity' },
      0.2
    )
    .to(accent, { '--hero-underline': 1, duration: 0.65, clearProps: '--hero-underline' }, 0.54)
    .to(
      copy,
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, clearProps: 'transform,opacity' },
      0.58
    )

  enter(entrance, { trigger: hero })
}
