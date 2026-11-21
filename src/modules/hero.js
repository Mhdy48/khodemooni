export function initHero({ gsap, reduced, enter }) {
  const pieces = gsap.utils.toArray('.piece')
  const swatch = document.querySelector('.hero-swatch')
  const accent = document.querySelector('.piece-accent')
  const markCut = () => accent.classList.add('is-cut')

  function ambient() {
    gsap.to('#hero-img', {
      scale: 1.07,
      duration: 12,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 2.4,
    })

    if (matchMedia('(pointer: fine)').matches) {
      const hero = document.getElementById('hero')
      gsap.set(pieces, { transformPerspective: 900 })
      const tilt = pieces.map((p) => ({
        rx: gsap.quickTo(p, 'rotationX', { duration: 0.7, ease: 'power3.out' }),
        ry: gsap.quickTo(p, 'rotationY', { duration: 0.7, ease: 'power3.out' }),
      }))
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        tilt.forEach((s, i) => {
          const k = i ? -1 : 1
          s.rx(ny * -5 * k)
          s.ry(nx * 7 * k)
        })
      })
      hero.addEventListener('mouseleave', () =>
        tilt.forEach((s) => {
          s.rx(0)
          s.ry(0)
        })
      )
    }
  }

  if (reduced) {
    markCut()
    return
  }

  const base = pieces.map((p) => Number(p.dataset.rot))
  gsap.set(pieces, { y: -70, opacity: 0, rotation: (i) => base[i] + (i ? 6 : -7) })
  gsap.set('.cut-dash', { opacity: 0 })
  gsap.set('.cut-solid', { opacity: 1, strokeDashoffset: 1 })
  gsap.set('.hero-in', { opacity: 0, y: 18 })
  gsap.set(swatch, { clipPath: 'inset(0 0 100% 0)', rotation: 4.5 })
  gsap.set('#hero-img', { scale: 1.12 })

  const tl = gsap.timeline({ paused: true, onStart: ambient, defaults: { ease: 'power3.out' } })
  pieces.forEach((piece, i) => {
    const at = i * 0.28
    tl.to(piece, { y: 0, opacity: 1, rotation: base[i], duration: 0.95, ease: 'power4.out' }, at)
    tl.to(
      piece.querySelector('.cut-solid'),
      { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' },
      at + 0.45
    )
    tl.to(piece.querySelector('.cut-dash'), { opacity: 1, duration: 0.3 }, at + 1.15)
    tl.to(piece.querySelector('.cut-solid'), { opacity: 0, duration: 0.3 }, at + 1.15)
  })
  tl.add(markCut, 1.5)
  tl.to(
    swatch,
    { clipPath: 'inset(0 0 0% 0)', rotation: 1.8, duration: 1.25, ease: 'power3.inOut' },
    0.35
  )
    .to('#hero-img', { scale: 1, duration: 1.7 }, 0.35)
    .to('.hero-in', { opacity: 1, y: 0, duration: 0.8, stagger: 0.14 }, 0.9)
    .set(swatch, { clearProps: 'clipPath' })
  enter(tl, { trigger: document.getElementById('hero') })
}
