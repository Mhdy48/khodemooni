import { twoDigits } from './i18n.js'

export function initLoader({ gsap, reduced }) {
  const loader = document.getElementById('loader')
  const fire = () => {
    if (window.__kkReady) return
    window.__kkReady = true
    document.dispatchEvent(new Event('kk:ready'))
  }

  if (!loader) {
    fire()
    return
  }

  const percent = loader.querySelector('#loader-percent')
  const ring = loader.querySelector('#loader-ring')
  const bar = loader.querySelector('#loader-bar')
  const state = { value: 0 }
  const render = () => {
    percent.textContent = twoDigits.format(state.value)
    ring.style.strokeDashoffset = 100 - state.value
    bar.style.transform = `scaleX(${state.value / 100})`
  }
  const counting = reduced ? null : gsap.to(state, {
    value: 92,
    duration: 2.6,
    ease: 'power2.out',
    onUpdate: render,
  })

  const start = performance.now()
  let lifted = false
  const lift = () => {
    if (lifted) return
    lifted = true
    counting?.kill()
    const wait = Math.max(0, 1050 - (performance.now() - start))
    setTimeout(() => {
      if (reduced) {
        loader.remove()
        fire()
        return
      }
      gsap.timeline({ onComplete: () => { loader.remove(); fire() } })
        .to(state, { value: 100, duration: 0.32, ease: 'power2.out', onUpdate: render })
        .to(loader.querySelectorAll('.ld-inner, .ld-meta, .ld-bottom, .ld-aura'), {
          opacity: 0,
          y: -18,
          duration: 0.38,
          stagger: 0.035,
          ease: 'power2.in',
        }, '+=0.12')
        .to(loader.querySelectorAll('.ld-panel'), {
          yPercent: -100,
          duration: 0.9,
          stagger: { each: 0.055, from: 'center' },
          ease: 'power4.inOut',
        }, '-=0.1')
    }, wait)
  }

  if (document.readyState === 'complete') lift()
  else window.addEventListener('load', lift, { once: true })
  setTimeout(lift, 3200)
}