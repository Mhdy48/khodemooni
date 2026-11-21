export function initFaq({ gsap, reduced }) {
  const items = [...document.querySelectorAll('.faq-item')]

  function setOpen(item, open, instant = false) {
    const panel = item.querySelector('.faq-a')
    const btn = item.querySelector('.faq-q')
    item.classList.toggle('is-open', open)
    btn.setAttribute('aria-expanded', String(open))
    if (instant || reduced) {
      panel.style.height = open ? 'auto' : '0px'
    } else {
      gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.45, ease: 'power2.inOut' })
    }
  }

  items.forEach((item) => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open')
      items.forEach((other) => { if (other !== item && other.classList.contains('is-open')) setOpen(other, false) })
      setOpen(item, !isOpen)
    })
  })

  setOpen(items[0], true, true)
}