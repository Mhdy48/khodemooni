export function initHero({ gsap, reduced, enter }) {
  const hero = document.getElementById('hero')
  const swatch = hero.querySelector('.hero-swatch')
  const detail = hero.querySelector('.hero-detail')
  const cards = [...swatch.querySelectorAll('.hero-photo')]
  const views = swatch.querySelector('.hero-views')
  const buttons = [...views.querySelectorAll('button')]

  const select = (index) => {
    cards.forEach((card, position) => {
      const offset = (position - index + cards.length) % cards.length
      card.dataset.position = ['front', 'left', 'right'][offset]
      card.setAttribute('aria-hidden', String(offset !== 0))
      buttons[position].setAttribute('aria-pressed', String(offset === 0))
    })
    detail.setAttribute('aria-controls', buttons[index].getAttribute('aria-controls'))
    detail.setAttribute('aria-pressed', 'false')
    swatch.classList.remove('is-detail')
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index))
    cards[index].addEventListener('click', () => {
      if (cards[index].dataset.position !== 'front') select(index)
    })
  })
  views.hidden = false

  detail.hidden = false
  detail.addEventListener('click', () => {
    const active = swatch.classList.toggle('is-detail')
    detail.setAttribute('aria-pressed', String(active))
  })

  if (reduced) return

  const object = swatch.querySelector('.hero-object')
  const tiltEnabled = matchMedia('(any-hover: hover) and (prefers-reduced-motion: no-preference)')
  let frame = 0

  const resetTilt = () => {
    cancelAnimationFrame(frame)
    for (const key of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) {
      object.style.removeProperty(key)
    }
  }

  swatch.addEventListener('pointermove', (event) => {
    if (!tiltEnabled.matches || event.pointerType === 'touch') return
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const rect = swatch.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      object.style.setProperty('--tilt-x', (0.5 - y) * 12 + 'deg')
      object.style.setProperty('--tilt-y', (x - 0.5) * 20 + 'deg')
      object.style.setProperty('--light-x', x * 100 + '%')
      object.style.setProperty('--light-y', y * 100 + '%')
    })
  })
  swatch.addEventListener('pointerleave', resetTilt)
  swatch.addEventListener('pointercancel', resetTilt)
  tiltEnabled.addEventListener('change', resetTilt)

  const title = hero.querySelectorAll('.piece')
  const accent = hero.querySelector('.hero-title-accent')
  const copy = hero.querySelectorAll('.hero-in')
  gsap.set(cards, { clipPath: 'inset(0 0 100% 0)' })
  gsap.set(title, { x: (index) => (index === 0 ? 18 : -18), opacity: 0 })
  gsap.set(accent, { '--hero-underline': 0 })
  gsap.set(copy, { y: 12, opacity: 0 })

  const entrance = gsap
    .timeline({ paused: true, defaults: { ease: 'power3.out' } })
    .to(cards, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.76,
      stagger: 0.09,
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
