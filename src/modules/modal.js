import { messages } from './i18n.js'

const normalizeDigits = (s) =>
  s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
   .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))

export function initModal({ gsap, reduced }) {
  const modal = document.getElementById('modal')
  const panel = document.getElementById('modal-panel')
  const backdrop = document.getElementById('modal-backdrop')
  const form = document.getElementById('consult-form')
  const success = document.getElementById('form-success')
  const submitBtn = document.getElementById('form-submit')
  const nameInput = document.getElementById('f-name')
  const phoneInput = document.getElementById('f-phone')
  const serviceSelect = document.getElementById('f-service')
  let isOpen = false
  let lastFocus = null

  function open(service) {
    lastFocus = document.activeElement
    isOpen = true
    if (service) serviceSelect.value = service
    form.classList.remove('hidden')
    success.classList.add('hidden')
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    document.body.style.overflow = 'hidden'
    if (!reduced) {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(panel, { y: 44, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' })
    }
    setTimeout(() => nameInput.focus(), reduced ? 0 : 120)
  }

  function close() {
    if (!isOpen) return
    isOpen = false
    document.body.style.overflow = ''
    const hide = () => { modal.classList.add('hidden'); modal.classList.remove('flex') }
    if (reduced) hide()
    else {
      gsap.to(panel, { y: 26, opacity: 0, duration: 0.25, ease: 'power2.in' })
      gsap.to(backdrop, { opacity: 0, duration: 0.25, onComplete: hide })
    }
    clearErrors()
    if (lastFocus) lastFocus.focus()
  }

  document.querySelectorAll('.open-modal').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.service))
  })
  document.getElementById('modal-close').addEventListener('click', close)
  document.getElementById('success-close').addEventListener('click', close)
  backdrop.addEventListener('click', close)
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return
    if (e.key === 'Escape') close()
    if (e.key === 'Tab') {
      const focusables = [...panel.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => el.offsetParent !== null)
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  })

  function setError(input, msg) {
    const errEl = panel.querySelector(`[data-error-for="${input.id}"]`)
    input.classList.toggle('is-invalid', Boolean(msg))
    errEl.textContent = msg || ''
    if (msg && !reduced) gsap.fromTo(input, { x: 0 }, { keyframes: [{ x: -7 }, { x: 7 }, { x: -4 }, { x: 4 }, { x: 0 }], duration: 0.4 })
  }
  function clearErrors() {
    setError(nameInput, '')
    setError(phoneInput, '')
  }

  nameInput.addEventListener('input', () => setError(nameInput, ''))
  phoneInput.addEventListener('input', () => setError(phoneInput, ''))

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = nameInput.value.trim()
    const phone = normalizeDigits(phoneInput.value).replace(/[\s-]/g, '')
    let ok = true
    if (name.length < 3) { setError(nameInput, messages.err_name); ok = false }
    if (!/^09\d{9}$/.test(phone) && !/^0[1-8]\d{9}$/.test(phone)) { setError(phoneInput, messages.err_phone); ok = false }
    if (!ok) return

    submitBtn.disabled = true
    submitBtn.querySelector('.submit-label').classList.add('opacity-60')
    submitBtn.querySelector('.submit-spin').classList.remove('hidden')

    setTimeout(() => {
      submitBtn.disabled = false
      submitBtn.querySelector('.submit-label').classList.remove('opacity-60')
      submitBtn.querySelector('.submit-spin').classList.add('hidden')
      form.classList.add('hidden')
      success.classList.remove('hidden')
      if (!reduced) {
        gsap.fromTo(success, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
        const check = document.getElementById('success-check')
        const len = check.getTotalLength()
        gsap.fromTo(check, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.6, delay: 0.2, ease: 'power2.out' })
      }
      form.reset()
      document.getElementById('success-close').focus()
    }, 900)
  })
}