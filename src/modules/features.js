import { animate, hover } from 'motion'

export function initFeatures({ gsap, reduced, enter }) {
  const bar = document.getElementById('features-bar')
  if (!bar) return

  const track = bar.querySelector('.feat-track')
  const solid = bar.querySelector('.feat-thread-solid')
  const dash = bar.querySelector('.feat-thread-dash')
  const shuttle = bar.querySelector('.feat-shuttle')
  const stations = gsap.utils.toArray('.feat-station', bar)
  const nodes = gsap.utils.toArray('.feat-node', bar)
  const draws = gsap.utils.toArray('.feat-icon .draw', bar)
  const labels = gsap.utils.toArray('.feat-label .line-inner', bar)

  const settle = () => {
    gsap.set(bar, { clearProps: 'all' })
    gsap.set(solid, { opacity: 0 })
    gsap.set(dash, { opacity: 1 })
    gsap.set(nodes, { clearProps: 'transform,opacity' })
    gsap.set(draws, { strokeDashoffset: 0 })
    gsap.set(labels, { clearProps: 'transform' })
  }

  const springs = () => {
    stations.forEach((st) => {
      const node = st.querySelector('.feat-node')
      hover(node, () => {
        const lift = animate(node, { scale: 1.08, y: -3 }, { type: 'spring', stiffness: 340, damping: 20 })
        return () => {
          lift.stop()
          animate(node, { scale: 1, y: 0 }, { type: 'spring', stiffness: 340, damping: 24 })
        }
      })
    })
  }

  let shuttleTl = null
  let held = false
  const dist = () => Math.max(track.scrollWidth - 52 - 26, 0)
  const ambient = () => {
    if (reduced) return
    shuttleTl = gsap
      .timeline({ repeat: -1, repeatDelay: 1.4 })
      .set(shuttle, { x: 0, opacity: 0 })
      .to(shuttle, { opacity: 1, duration: 0.35 })
      .to(shuttle, { x: () => -dist(), duration: 5.2, ease: 'none' }, '<')
      .to(shuttle, { opacity: 0, duration: 0.35 }, '-=0.35')
    const hold = () => { held = true; shuttleTl.pause() }
    const release = () => { held = false; shuttleTl.resume() }
    stations.forEach((st) => {
      st.addEventListener('pointerenter', hold)
      st.addEventListener('pointerleave', release)
      st.addEventListener('focus', hold)
      st.addEventListener('blur', release)
    })
    let rt
    window.addEventListener('resize', () => {
      clearTimeout(rt)
      rt = setTimeout(() => {
        shuttleTl.invalidate()
        if (held) shuttleTl.pause()
      }, 200)
    })
  }

  if (reduced) {
    settle()
    return
  }

  gsap.set(bar, { y: 44, opacity: 0 })
  gsap.set(solid, { opacity: 1, strokeDashoffset: 1 })
  gsap.set(dash, { opacity: 0 })
  gsap.set(nodes, { scale: 0.3, rotation: -24, opacity: 0 })
  gsap.set(draws, { strokeDashoffset: 1 })
  gsap.set(labels, { yPercent: 112 })

  const timeline = gsap.timeline({ paused: true })
  timeline
    .to(bar, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' })
    .to(solid, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0.15)
    .to(
      nodes,
      {
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'back.out(2.2)',
        stagger: 0.09,
        onComplete: () => gsap.set(nodes, { clearProps: 'transform' }),
      },
      0.35
    )
    .to(draws, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05 }, 0.6)
    .to(labels, { yPercent: 0, duration: 0.7, ease: 'power4.out', stagger: 0.06 }, 0.75)
    .to(solid, { opacity: 0, duration: 0.3 }, 1.25)
    .to(dash, { opacity: 1, duration: 0.3 }, 1.25)
    .add(() => {
      springs()
      ambient()
    }, 1.5)
  enter(timeline, { trigger: bar })
}