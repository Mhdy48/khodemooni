function initPhotoAutoplay(photos) {
  const viewer = photos.closest('.about-viewer')
  const views = [...viewer.querySelectorAll('input[name="workshop-view"]')]
  const playback = viewer.querySelector('.about-autoplay')
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let playing = !motion.matches
  let visible = false
  let hovered = false
  let timer

  function schedule() {
    clearTimeout(timer)
    const focused =
      views.includes(document.activeElement) && document.activeElement.matches(':focus-visible')
    if (!playing || !visible || hovered || focused || document.hidden || !window.__kkReady) return

    timer = setTimeout(() => {
      views.find((view) => !view.checked).checked = true
      schedule()
    }, 5000)
  }

  function syncPlayback() {
    playback.setAttribute(
      'aria-label',
      playing ? playback.dataset.pauseLabel : playback.dataset.playLabel
    )
    playback.toggleAttribute('data-playing', playing)
    schedule()
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.intersectionRatio >= 0.5
      schedule()
    },
    { threshold: 0.5 }
  )
  observer.observe(photos)
  document.addEventListener('kk:ready', schedule, { once: true })
  document.addEventListener('visibilitychange', schedule)
  viewer.addEventListener('change', schedule)
  viewer.addEventListener('focusin', schedule)
  viewer.addEventListener('focusout', () => queueMicrotask(schedule))
  photos.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return
    hovered = true
    schedule()
  })
  photos.addEventListener('pointerleave', () => {
    hovered = false
    schedule()
  })
  motion.addEventListener('change', (event) => {
    if (event.matches) playing = false
    syncPlayback()
  })
  playback.addEventListener('click', () => {
    playing = !playing
    syncPlayback()
  })

  playback.hidden = false
  syncPlayback()
}

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
    more.inert = !expanded
    icon.style.transform = expanded ? 'rotate(45deg)' : ''
    toggle.setAttribute('aria-expanded', String(expanded))
  }

  toggle.addEventListener('click', () => {
    expanded = !expanded
    sync()
  })

  const photos = document.querySelector('.about-photos')
  initPhotoAutoplay(photos)
  if (reduced) return
  const card = document.querySelector('.about-card')
  const images = photos.querySelectorAll('img')
  const lines = gsap.utils.toArray('#about .line-inner')

  gsap.set(card, { y: 24, opacity: 0 })
  gsap.set(lines, { yPercent: 112 })
  gsap.set(photos, { clipPath: 'inset(0 0 100% 0)' })
  gsap.set(images, { scale: 1.07 })

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
  tl.to(card, { y: 0, opacity: 1, duration: 0.65, clearProps: 'transform,opacity' })
    .to(lines, { yPercent: 0, duration: 0.8, stagger: 0.11, clearProps: 'transform' }, 0.18)
    .to(
      photos,
      { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' },
      0.12
    )
    .to(images, { scale: 1, duration: 1.15, clearProps: 'transform' }, 0.12)
  enter(tl, { trigger: card, start: 'top 78%' })
}
