import { URL, createBrowserCheck, sleep, switchLanguage } from './helpers/browser.mjs'

const { browser, errors, newPage } = await createBrowserCheck()
const page = await newPage(1440, 900)
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.waitForSelector('#loader', { hidden: true })

// rapid gallery clicks
await page.evaluate(() => document.getElementById('portfolio').scrollIntoView())
await sleep(900)
for (let i = 0; i < 8; i++) {
  await page.click('#gallery-next')
  await sleep(90)
}
await sleep(1200)
const tiles = await page.evaluate(
  () => document.querySelectorAll('#gallery-grid .gallery-tile').length
)

// rapid faq toggles
await page.evaluate(() => document.getElementById('faq').scrollIntoView())
await sleep(700)
for (let i = 0; i < 10; i++) {
  const qs = await page.$$('.faq-q')
  await qs[i % 5].click()
  await sleep(70)
}
await sleep(700)
const openCount = await page.evaluate(() => document.querySelectorAll('.faq-item.is-open').length)

// modal open/close x3 + lightbox open/close x3
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => document.querySelector('#cta .open-modal').click())
  await sleep(350)
  await page.keyboard.press('Escape')
  await sleep(350)
}
await page.evaluate(() => document.getElementById('portfolio').scrollIntoView())
await sleep(600)
for (let i = 0; i < 3; i++) {
  await page.click('#gallery-grid .gallery-tile')
  await sleep(350)
  await page.click('#lightbox-next')
  await sleep(250)
  await page.keyboard.press('Escape')
  await sleep(350)
}
const lbHidden = await page.evaluate(() =>
  document.getElementById('lightbox').classList.contains('hidden')
)
const modalHidden = await page.evaluate(() =>
  document.getElementById('modal').classList.contains('hidden')
)
const bodyOverflow = await page.evaluate(() => document.body.style.overflow)

// lang flip x4
for (const l of ['ar', 'fa', 'ar', 'fa']) {
  await switchLanguage(page, l)
}
const lang = await page.evaluate(() => document.documentElement.lang)
const heroText = await page.evaluate(
  () => document.querySelector('[data-copy="hero_t1"]').textContent
)
const marqueeSpans = await page.evaluate(
  () => document.querySelectorAll('#marquee .marquee-chunk').length
)
const dupIds = await page.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
  return ids.filter((id, i) => ids.indexOf(id) !== i)
})

console.log(
  JSON.stringify(
    { tiles, openCount, lbHidden, modalHidden, bodyOverflow, lang, heroText, marqueeSpans, dupIds },
    null,
    1
  )
)
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO ERRORS')
await browser.close()

if (errors.length) process.exitCode = 1
