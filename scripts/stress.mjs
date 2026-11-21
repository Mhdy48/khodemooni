import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2000))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// rapid gallery clicks
await page.evaluate(() => document.getElementById('portfolio').scrollIntoView())
await sleep(900)
for (let i = 0; i < 8; i++) { await page.click('#gallery-next'); await sleep(90) }
await sleep(1200)
const tiles = await page.evaluate(() => document.querySelectorAll('#gallery-grid .gallery-tile').length)

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
const lbHidden = await page.evaluate(() => document.getElementById('lightbox').classList.contains('hidden'))
const modalHidden = await page.evaluate(() => document.getElementById('modal').classList.contains('hidden'))
const bodyOverflow = await page.evaluate(() => document.body.style.overflow)

// lang flip x4
for (const l of ['ar', 'fa', 'ar', 'fa']) {
  await page.click(`.lang-btn[data-lang="${l}"]`)
  await sleep(250)
}
const lang = await page.evaluate(() => document.documentElement.lang)
const heroText = await page.evaluate(() => document.querySelector('[data-i18n="hero_t1"]').textContent)
const marqueeSpans = await page.evaluate(() => document.querySelectorAll('#marquee .marquee-chunk').length)
const dupIds = await page.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
  return ids.filter((id, i) => ids.indexOf(id) !== i)
})

console.log(JSON.stringify({ tiles, openCount, lbHidden, modalHidden, bodyOverflow, lang, heroText, marqueeSpans, dupIds }, null, 1))
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO ERRORS')
await browser.close()