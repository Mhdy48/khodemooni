import assert from 'node:assert/strict'
import { createBrowserCheck, URL, sleep } from './helpers/browser.mjs'

const { browser, newPage, errors } = await createBrowserCheck()
const sections = [
  'hero',
  'features',
  'about',
  'process',
  'portfolio',
  'faq',
  'cta',
  'contact',
]

const settled = (id) => {
  const sec = document.getElementById(id)
  const reveals = [...sec.querySelectorAll('[data-reveal]')].map((el) =>
    Number(getComputedStyle(el).opacity)
  )
  const extra = {}
  if (id === 'features')
    extra.bar = Number(getComputedStyle(document.getElementById('features-bar')).opacity)
  if (id === 'about') {
    extra.card = Number(getComputedStyle(document.querySelector('.about-card')).opacity)
    extra.counters = [...document.querySelectorAll('.counter')]
      .map((el) => el.textContent)
      .join(',')
  }
  if (id === 'hero')
    extra.piece = Number(getComputedStyle(document.querySelector('.piece')).opacity)
  return {
    y: Math.round(scrollY),
    loader: !!document.querySelector('#loader'),
    hidden: reveals.filter((o) => o < 0.05).length,
    min: reveals.length ? Math.min(...reveals) : 1,
    extra,
  }
}

const loaderVisible = () => {
  const loader = document.querySelector('#loader')
  return (
    loader &&
    getComputedStyle(loader).display !== 'none' &&
    Number(getComputedStyle(loader).opacity) === 1 &&
    loader.getBoundingClientRect().height === innerHeight
  )
}

try {
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [375, 812, true],
  ]) {
    for (const id of sections) {
      const p = await newPage(width, height, mobile)
      await p.goto(URL, { waitUntil: 'networkidle0' })
      await p.waitForFunction(() => !document.querySelector('#loader'))
      await p.evaluate(
        (s) => document.getElementById(s).scrollIntoView({ block: 'center', behavior: 'instant' }),
        id
      )
      await sleep(900)
      const pre = await p.evaluate(() => Math.round(scrollY))
      await p.reload({ waitUntil: 'domcontentloaded' })
      await sleep(150)
      assert(await p.evaluate(loaderVisible), `${width}/${id}: reload shows full-screen loader`)
      await p.evaluate(() => scrollTo({ top: scrollY + 1, behavior: 'instant' }))
      await sleep(100)
      assert(await p.evaluate(loaderVisible), `${width}/${id}: scrolling does not dismiss loader`)
      if (id === 'process') await p.screenshot({ path: `shots/reload-loader-${width}.png` })
      await p.waitForFunction(() => !document.querySelector('#loader'))
      await sleep(2600)
      const r = await p.evaluate(settled, id)
      assert(Math.abs(r.y - pre) < 40, `${width}/${id}: reload kept scroll (${r.y} vs ${pre})`)
      assert(r.hidden === 0 && r.min === 1, `${width}/${id}: section painted settled`)
      assert(
        await p.evaluate(() => window.__kkReady === true),
        `${width}/${id}: readiness signalled`
      )
      if (id === 'features') assert(r.extra.bar === 1, 'features bar settled')
      if (id === 'about') {
        assert(r.extra.card === 1, 'about card settled')
        assert(r.extra.counters === '۱۲,۲۴۰,۱۸۰,۹۸', 'about counters settled')
      }
      if (id === 'hero') assert(r.extra.piece === 1, 'hero pieces settled')
      if (id === 'process') await p.screenshot({ path: `shots/reload-settled-${width}.png` })
      console.log(`${width}/${id}: loader shown, kept ${r.y}`)
      await p.close()
    }
  }

  const h = await newPage(1440, 900)
  await h.goto(URL, { waitUntil: 'networkidle0' })
  await h.waitForFunction(() => !document.querySelector('#loader'))
  await h.click('.nav-link[href="#process"]')
  await sleep(1300)
  const anchorY = await h.evaluate(() => Math.round(scrollY))
  for (let i = 0; i < 3; i++) {
    await h.reload({ waitUntil: 'domcontentloaded' })
    await sleep(150)
    assert(await h.evaluate(loaderVisible), 'hash reload shows loader')
    await h.waitForFunction(() => !document.querySelector('#loader'))
    await sleep(1400)
    const hr = await h.evaluate(() => ({
      y: Math.round(scrollY),
      top: Math.round(document.getElementById('process').getBoundingClientRect().top),
      nav: Math.round(document.getElementById('navbar').getBoundingClientRect().bottom),
      min: Math.min(
        ...[...document.querySelectorAll('#process [data-reveal]')].map((el) =>
          Number(getComputedStyle(el).opacity)
        )
      ),
    }))
    assert(Math.abs(hr.y - anchorY) < 40, 'hash reload kept position')
    assert(hr.top >= hr.nav - 4, 'hash reload lands below navbar')
    assert(hr.min === 1, 'hash reload painted settled')
  }
  await h.close()
  console.log('Repeated hash reloads: loader shown, anchor preserved')

  for (const [width, height, mobile] of [
    [1440, 900, false],
    [375, 812, true],
    [844, 390, true],
  ]) {
    const p = await newPage(width, height, mobile, true)
    await p.goto(URL, { waitUntil: 'domcontentloaded' })
    assert.equal(await p.$('#loader'), null, 'reduced motion: page opens directly')
    await p.evaluate(() =>
      document.getElementById('faq').scrollIntoView({ block: 'center', behavior: 'instant' })
    )
    await sleep(200)
    const pre = await p.evaluate(() => Math.round(scrollY))
    await p.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await p.$('#loader'), null, 'reduced motion: reload opens directly')
    const r = await p.evaluate(settled, 'faq')
    assert(Math.abs(r.y - pre) < 40 && r.min === 1, 'reduced motion: restored section visible')
    await p.close()
    console.log(`${width}x${height}/reduced: loader skipped, position kept`)
  }

  for (const [overlay, section, mobile] of [
    ['modal', 'cta', false],
    ['lightbox', 'portfolio', false],
    ['mobile-menu', 'faq', true],
  ]) {
    const p = await newPage(mobile ? 375 : 1440, mobile ? 812 : 900, mobile)
    await p.goto(URL, { waitUntil: 'networkidle0' })
    await p.waitForFunction(() => !document.querySelector('#loader'))
    await p.evaluate(
      (id) => document.getElementById(id).scrollIntoView({ block: 'center', behavior: 'instant' }),
      section
    )
    await sleep(1800)
    if (overlay === 'modal') await p.click('#cta .open-modal')
    if (overlay === 'lightbox') await p.click('#gallery-grid .gallery-tile')
    if (overlay === 'mobile-menu') await p.click('#menu-open')
    await sleep(400)
    assert(
      await p.evaluate((id) => !document.getElementById(id).classList.contains('hidden'), overlay),
      `${overlay}: opened`
    )
    const pre = await p.evaluate(() => Math.round(scrollY))
    await p.reload({ waitUntil: 'domcontentloaded' })
    await sleep(150)
    assert(await p.evaluate(loaderVisible), `${overlay}: reload shows loader`)
    await p.waitForFunction(() => !document.querySelector('#loader'))
    assert(
      await p.evaluate(
        (id) =>
          document.getElementById(id).classList.contains('hidden') &&
          document.body.style.overflow === '',
        overlay
      ),
      `${overlay}: reload clears overlay and scroll lock`
    )
    const post = await p.evaluate(() => scrollY)
    assert(Math.abs(post - pre) < 40, `${overlay}: reload kept position (${post} vs ${pre})`)
    await p.close()
    console.log(`${overlay}: loader shown, scroll lock cleared`)
  }

  assert.deepEqual(errors, [])
  console.log('ALL RESTORE CHECKS PASSED')
} finally {
  await browser.close()
}
