export function initFaq({ gsap, reduced }) {
  const items = [...document.querySelectorAll('.faq-item')]

  function setOpen(item, open, instant = false) {
    const panel = item.querySelector('.faq-a')
    const btn = item.querySelector('.faq-q')
    item.classList.toggle('is-open', open)
    panel.inert = !open
    btn.setAttribute('aria-expanded', String(open))
    if (instant || reduced) {
      panel.style.height = open ? 'auto' : '0px'
    } else {
      gsap.to(panel, {
        height: open ? 'auto' : 0,
        overwrite: 'auto',
        duration: 0.45,
        ease: 'power2.inOut',
      })
    }
  }

  items.forEach((item) => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open')
      items.forEach((other) => {
        if (other !== item && other.classList.contains('is-open')) setOpen(other, false)
      })
      setOpen(item, !isOpen)
    })
  })

  items.forEach((item, index) => setOpen(item, index === 0, true))
}
