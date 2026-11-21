export function initReveal({ gsap, reduced, enter }) {
  if (reduced) return

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const animation = gsap.fromTo(el, { y: 38, opacity: 0 }, {
      paused: true,
      y: 0,
      opacity: 1,
      duration: 0.9,
      delay: parseFloat(el.dataset.delay || 0),
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    })
    enter(animation, { trigger: el })
  })

  const line = document.getElementById('process-line')
  if (line) {
    const animation = gsap.from(line, {
      paused: true,
      scaleX: 0,
      duration: 1.4,
      ease: 'power2.inOut',
    })
    enter(animation, { trigger: document.getElementById('process'), start: 'top 65%' })
  }
}
