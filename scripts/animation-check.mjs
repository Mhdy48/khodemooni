import assert from 'node:assert/strict'
import { createBrowserCheck, URL, sleep } from './helpers/browser.mjs'

const { browser, newPage, errors } = await createBrowserCheck()
const targets = {
  hero: '.piece',
  features: '#features-bar',
  about: '.about-card',
  counters: '.about-stats .stat',
  services: '#services [data-reveal]',
  process: '#process [data-reveal]',
}

async function observe(page, selector) {
  await page.evaluateOnNewDocument((target) => {
    window.motionSamples = []
    document.addEventListener('kk:ready', () => { window.motionReady = performance.now() }, { once: true })
    document.addEventListener('DOMContentLoaded', () => {
      const sample = () => {
        const el = document.querySelector(target)
        const style = getComputedStyle(el)
        window.motionSamples.push({
          loader: !!document.querySelector('#loader'),
          opacity: Number(style.opacity),
          transform: style.transform,
          count: document.querySelector('.counter').textContent,
        })
        if (!window.motionReady || performance.now() - window.motionReady < 2500) requestAnimationFrame(sample)
        else window.motionDone = true
      }
      sample()
    }, { once: true })
  }, selector)
}

function verify(samples, name, counters = false) {
  const covered = samples.filter((sample) => sample.loader)
  const visible = samples.filter((sample) => !sample.loader)
  const prepared = covered.findIndex((sample) => sample.opacity === 0)
  assert(prepared >= 0 && covered.slice(prepared).every((sample) => sample.opacity === 0), `${name}: prepared entrance waits behind loader`)
  assert(visible.some((sample) => sample.opacity > 0 && sample.opacity < 0.98), `${name}: visible intermediate animation frames`)
  assert(visible.at(-1).opacity === 1, `${name}: entrance completed`)
  assert(new Set(visible.map((sample) => sample.transform)).size > 2, `${name}: visible movement, not just final state`)
  if (counters) {
    assert(covered.every((sample) => sample.count === '۰'), `${name}: counting waits for loader`)
    assert(new Set(visible.map((sample) => sample.count)).size > 3, `${name}: numbers count visibly`)
    assert(visible.at(-1).count === '۱۲', `${name}: final count is correct`)
  }
}

try {
  for (const [width, height, mobile] of [[1440, 900, false], [375, 812, true]]) {
    for (const [name, selector] of Object.entries(targets)) {
      const page = await newPage(width, height, mobile)
      await observe(page, selector)
      await page.goto(URL, { waitUntil: 'networkidle0' })
      await page.waitForFunction(() => window.motionDone)
      if (name === 'hero') verify(await page.evaluate(() => window.motionSamples), `${width}/fresh hero`)
      await page.evaluate((target) => document.querySelector(target).scrollIntoView({ block: 'center', behavior: 'instant' }), selector)
      await sleep(2400)
      const before = await page.evaluate(() => scrollY)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.motionDone)
      verify(await page.evaluate(() => window.motionSamples), `${width}/${name}`, name === 'counters')
      assert(Math.abs(await page.evaluate(() => scrollY) - before) < 40, `${width}/${name}: position preserved`)
      console.log(`${width}/${name}: visible entrance after loader, position preserved`)
      await page.close()
    }
  }

  const page = await newPage(1440, 900)
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !document.querySelector('#loader'))
  await sleep(2600)
  assert(await page.evaluate(() => getComputedStyle(document.querySelector('.about-card')).opacity === '0'), 'below-fold about waits for scroll')
  await page.evaluate(() => document.querySelector('.about-card').scrollIntoView({ block: 'start', behavior: 'instant' }))
  await sleep(180)
  const halfway = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.about-card')).opacity))
  assert(halfway > 0 && halfway < 1, 'scroll-triggered entrance animates')
  await sleep(2400)
  await page.evaluate(() => document.querySelector('.about-stats').scrollIntoView({ block: 'center', behavior: 'instant' }))
  await sleep(2400)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await sleep(200)
  await page.evaluate(() => document.querySelector('.about-stats').scrollIntoView({ block: 'center', behavior: 'instant' }))
  assert(await page.evaluate(() => [...document.querySelectorAll('.counter')].map((el) => el.textContent).join(',') === '۱۲,۲۴۰,۱۸۰,۹۸'), 'same-document scrolling does not restart counters')
  await page.close()

  assert.deepEqual(errors, [])
  console.log('ALL ANIMATION CHECKS PASSED')
} finally {
  await browser.close()
}
