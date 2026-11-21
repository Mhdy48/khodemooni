export function containTab(event, dialog) {
  if (event.key !== 'Tab') return
  const controls = [
    ...dialog.querySelectorAll(
      'a[href], button:enabled, input:enabled, select:enabled, textarea:enabled'
    ),
  ].filter((element) => element.getClientRects().length > 0)
  const boundary = event.shiftKey ? controls[0] : controls.at(-1)
  if (
    boundary &&
    (document.activeElement === boundary || !dialog.contains(document.activeElement))
  ) {
    event.preventDefault()
    const next = event.shiftKey ? controls.at(-1) : controls[0]
    next.focus()
  }
}
