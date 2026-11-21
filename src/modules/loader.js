export function initLoader({ reduced }) {
  const loader = document.getElementById('loader')
  const finish = () => {
    loader?.remove()
    if (window.__kkReady) return
    window.__kkReady = true
    document.dispatchEvent(new Event('kk:ready'))
  }

  if (!loader || reduced) {
    finish()
    return
  }

  loader.hidden = false
  loader.showModal()
  const [brandEntrance] = loader.querySelector('.loader-brand').getAnimations()
  let dismissing = false

  const dismiss = () => {
    if (dismissing) return
    dismissing = true
    clearTimeout(fallback)
    window.removeEventListener('load', dismiss)

    const exit = () => {
      loader.classList.add('is-leaving')
      const fade = loader.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 310,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      })
      const close = () => {
        loader.close()
        finish()
      }
      fade.finished.then(close, close)
    }
    // Let the brand finish appearing before revealing the page.
    Promise.resolve(brandEntrance?.finished).then(exit, exit)
  }

  loader.addEventListener('cancel', (event) => {
    event.preventDefault()
    dismiss()
  })
  const fallback = setTimeout(dismiss, 2400)
  if (document.readyState === 'complete') dismiss()
  else window.addEventListener('load', dismiss, { once: true })
}
