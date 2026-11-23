export function initTicker(gsap) {
  const ticker = document.getElementById('marquee')
  const items = ticker.firstElementChild
  const repeatedItems = items.cloneNode(true)
  repeatedItems.setAttribute('aria-hidden', 'true')
  const motion = matchMedia('(prefers-reduced-motion: no-preference)')
  const direction = getComputedStyle(ticker).direction === 'rtl' ? -1 : 1

  let inView = false
  let hovered = false
  let paused = false
  let playing = false
  let touchTimeout = 0
  let loopWidth = items.getBoundingClientRect().width
  let position = 0

  function advance(_, elapsed) {
    position = (position + Math.min(elapsed, 48) * 0.032) % loopWidth
    ticker.scrollLeft = direction * position
  }

  function updatePlayback() {
    const shouldPlay =
      motion.matches &&
      inView &&
      !hovered &&
      !paused &&
      !touchTimeout &&
      !ticker.matches(':focus-visible') &&
      loopWidth > 0
    if (shouldPlay === playing) return

    playing = shouldPlay
    if (playing) {
      position = Math.max(0, ticker.scrollLeft * direction) % loopWidth
      gsap.ticker.add(advance)
    } else {
      gsap.ticker.remove(advance)
    }
  }

  function updateMotion() {
    ticker.toggleAttribute('data-loop', motion.matches)
    if (motion.matches) {
      ticker.append(repeatedItems)
      ticker.setAttribute('aria-keyshortcuts', 'Space')
    } else {
      repeatedItems.remove()
      ticker.removeAttribute('aria-keyshortcuts')
    }
    updatePlayback()
  }

  function pauseForTouch() {
    clearTimeout(touchTimeout)
    touchTimeout = setTimeout(() => {
      touchTimeout = 0
      updatePlayback()
    }, 1600)
    updatePlayback()
  }

  ticker.addEventListener('pointerenter', (event) => {
    hovered = event.pointerType === 'mouse'
    updatePlayback()
  })
  ticker.addEventListener('pointerleave', () => {
    hovered = false
    updatePlayback()
  })
  ticker.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') pauseForTouch()
  })
  ticker.addEventListener(
    'scroll',
    () => {
      if (touchTimeout) pauseForTouch()
    },
    { passive: true }
  )
  ticker.addEventListener('focus', updatePlayback)
  ticker.addEventListener('blur', updatePlayback)
  ticker.addEventListener('keydown', (event) => {
    if (!motion.matches || event.code !== 'Space' || event.repeat) return
    event.preventDefault()
    paused = !paused
    updatePlayback()
  })

  new ResizeObserver(() => {
    loopWidth = items.getBoundingClientRect().width
    updatePlayback()
  }).observe(items)
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    updatePlayback()
  }).observe(ticker)
  motion.addEventListener('change', updateMotion)
  updateMotion()
}
