export function initHero({ gsap, reduced, enter }) {
  const hero = document.getElementById('hero')
  const swatch = hero.querySelector('.hero-swatch')
  const detail = hero.querySelector('.hero-detail')

  detail.hidden = false
  detail.addEventListener('click', () => {
    const active = swatch.classList.toggle('is-detail')
    detail.setAttribute('aria-pressed', String(active))
  })

  if (reduced) return

  const photo = hero.querySelector('.hero-photo')
  const title = hero.querySelectorAll('.piece')
  const accent = hero.querySelector('.hero-title-accent')
  const copy = hero.querySelectorAll('.hero-in')
  gsap.set(photo, { clipPath: 'inset(100% 0 0 0)' })
  gsap.set(title, { y: 18, opacity: 0 })
  gsap.set(accent, { '--hero-underline': 0 })
  gsap.set(copy, { y: 12, opacity: 0 })

  const entrance = gsap
    .timeline({ paused: true, defaults: { ease: 'power3.out' } })
    .to(photo, { clipPath: 'inset(0% 0 0 0)', duration: 1.05, clearProps: 'clipPath' })
    .to(
      title,
      { y: 0, opacity: 1, duration: 0.72, stagger: 0.13, clearProps: 'transform,opacity' },
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
