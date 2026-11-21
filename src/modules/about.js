export function initAbout({ gsap, reduced, enter }) {
  const toggle = document.getElementById('about-toggle')
  const more = document.getElementById('about-more')
  const icon = document.getElementById('about-toggle-icon')
  const label = toggle.querySelector('[data-copy="about_more"]')
  const showMore = label.textContent
  let expanded = false

  function sync() {
    label.textContent = expanded ? toggle.dataset.collapseLabel : showMore
    more.style.gridTemplateRows = expanded ? '1fr' : '0fr'
    icon.style.transform = expanded ? 'rotate(45deg)' : ''
    toggle.setAttribute('aria-expanded', String(expanded))
  }

  toggle.addEventListener('click', () => { expanded = !expanded; sync() })

  if (reduced) return
  const card = document.querySelector('.about-card')
  const media = document.querySelector('.about-media')
  const img = document.getElementById('about-img')
  const stamp = document.querySelector('.about-stamp')
  const lines = gsap.utils.toArray('#about .line-inner')
  const eyebrow = document.querySelector('.about-eyebrow')

  const ambient = () => {
    gsap.to(img, { scale: 1.13, duration: 11, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2 })
    gsap.fromTo(img, { yPercent: -3.5 }, {
      yPercent: 3.5, ease: 'none',
      scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  }

  gsap.set(card, { y: 46, opacity: 0, scale: 0.985 })
  gsap.set(lines, { yPercent: 112 })
  gsap.set(stamp, { rotation: -14, scale: 0.7, opacity: 0 })
  gsap.set(media, { clipPath: 'inset(0 0 0 100%)' })
  gsap.set(img, { scale: 1.18 })
  gsap.set(eyebrow, { opacity: 0, y: 6 })

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
  tl.to(card, { y: 0, opacity: 1, scale: 1, duration: 1 })
    .to(eyebrow, { opacity: 1, y: 0, duration: 0.4, clearProps: 'transform,opacity' }, 0.2)
    .to(media, { clipPath: 'inset(0 0 0 0%)', duration: 1.15, ease: 'power3.inOut' }, 0.15)
    .to(img, { scale: 1.08, duration: 1.7, ease: 'power2.out' }, 0.15)
    .to(lines, { yPercent: 0, duration: 1.05, stagger: 0.14, ease: 'power4.out' }, 0.3)
    .to(stamp, { rotation: -2.5, scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2.2)' }, 0.65)
    .set(media, { clearProps: 'clipPath' })
    .add(ambient)
  enter(tl, { trigger: card, start: 'top 78%' })
}