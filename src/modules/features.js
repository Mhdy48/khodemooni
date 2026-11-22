export function initFeatures({ gsap, reduced, enter }) {
  const bar = document.getElementById('features-bar')
  if (!bar || reduced) return

  const tiles = bar.querySelectorAll('.feat-tile')
  gsap.set(bar, { y: 20, opacity: 0 })
  gsap.set(tiles, { y: 12, opacity: 0 })

  const timeline = gsap
    .timeline({ paused: true, defaults: { ease: 'power3.out' } })
    .to(bar, { y: 0, opacity: 1, duration: 0.56, clearProps: 'transform,opacity' })
    .to(
      tiles,
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.075, clearProps: 'transform,opacity' },
      0.12
    )
  enter(timeline, { trigger: bar })
}
