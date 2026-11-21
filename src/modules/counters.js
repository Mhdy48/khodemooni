import { integer } from './i18n.js'

export function initCounters({ gsap, reduced, enter }) {
  const strip = document.querySelector('.about-stats')
  const items = gsap.utils.toArray('.about-stats .stat')
  const counters = items.map((item) => item.querySelector('.counter'))

  if (reduced) return

  gsap.set(strip, { '--measure-fill': 0 })
  gsap.set(items, { opacity: 0, y: 12 })
  counters.forEach((el) => { el.textContent = integer.format(0) })

  const timeline = gsap.timeline({ paused: true })
  timeline.to(strip, { '--measure-fill': 1, duration: 1.1, ease: 'power2.inOut' }, 0)
    .to(items, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.08)

  counters.forEach((el, index) => {
    const target = Number(el.dataset.count)
    const state = { value: 0 }
    timeline.to(state, {
      value: target,
      duration: 1.55,
      ease: 'power2.out',
      onUpdate: () => {
        const value = integer.format(state.value)
        if (el.textContent !== value) el.textContent = value
      },
      onComplete: () => { el.textContent = integer.format(target) },
    }, 0.12 + index * 0.09)
  })
  enter(timeline, { trigger: strip })
}
