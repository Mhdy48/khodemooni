import { URL, sleep, createBrowserCheck, switchLanguage } from './helpers/browser.mjs'

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}

const { browser, errors, newPage } = await createBrowserCheck()

const settled = () =>
  !document.querySelector('#loader') &&
  [...document.querySelectorAll('.hero-in')].every(
    (el) => Number(getComputedStyle(el).opacity) > 0.99
  ) &&
  [...document.querySelectorAll('.piece')].every(
    (el) => Number(getComputedStyle(el).opacity) > 0.99
  )

/* desktop hero */
const page = await newPage(1440, 900)
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(settled, { timeout: 20000 })
await sleep(1600)
await page.screenshot({ path: 'shots/h1-desktop.png' })

const state = await page.evaluate(() => {
  const txt = (s) => document.querySelector(s)?.textContent.trim()
  const sizes = [
    ...document.querySelectorAll('#hero p, #hero button, #hero a, #hero .piece-text'),
  ].map((el) => ({
    t: el.textContent.trim().slice(0, 24),
    fs: parseFloat(getComputedStyle(el).fontSize),
  }))
  const targets = [...document.querySelectorAll('#hero button, #hero a')].map((el) =>
    Math.round(el.getBoundingClientRect().height)
  )
  const dash = [...document.querySelectorAll('.cut-dash')].map((el) =>
    Number(getComputedStyle(el).opacity)
  )
  const solid = [...document.querySelectorAll('.cut-solid')].map((el) =>
    Number(getComputedStyle(el).opacity)
  )
  return {
    t1: txt('[data-copy="hero_t1"]'),
    t2: txt('[data-copy="hero_t2"]'),
    accentCut: document.querySelector('.piece-accent')?.classList.contains('is-cut'),
    sizes,
    targets,
    dash,
    solid,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    swatchClip: getComputedStyle(document.querySelector('.hero-swatch')).clipPath,
  }
})
console.log('desktop state:', JSON.stringify(state, null, 1))
ok(state.t1 === 'امضای تو،', 'fa t1')
ok(state.t2.replace(/\s+/g, ' ') === 'در هر دوخت.', 'fa t2')
ok(state.accentCut, 'accent underline cut')
ok(
  state.dash.every((o) => o > 0.99),
  'dashed cut lines visible'
)
ok(
  state.solid.every((o) => o < 0.05),
  'solid trace faded out'
)
ok(
  state.sizes.every((s) => s.fs >= 16),
  'hero text >= 16px'
)
ok(
  state.targets.every((h) => h >= 48),
  'hero targets >= 48px'
)
ok(state.overflow <= 0, 'no horizontal overflow 1440')
ok(state.swatchClip === 'none', 'swatch clip cleared')

/* hover lift on a piece */
const pieceBox = await page.evaluate(() => {
  const r = document.querySelector('.piece-b').getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(pieceBox.x, pieceBox.y)
await sleep(700)
const liftY = await page.evaluate(() => {
  const m = new DOMMatrix(
    getComputedStyle(document.querySelector('.piece-b .piece-lift')).transform
  )
  return m.m42
})
ok(liftY < -3, `piece hover lift (y=${liftY})`)
await page.screenshot({ path: 'shots/h2-hover.png' })
await page.mouse.move(10, 10)
await sleep(600)

/* arabic */
await switchLanguage(page, 'ar')
await page.waitForFunction(settled)
await page.waitForSelector('.piece-accent.is-cut')
const ar = await page.evaluate(() => ({
  t1: document.querySelector('[data-copy="hero_t1"]').textContent.trim(),
  t2: document.querySelector('[data-copy="hero_t2"]').textContent.trim(),
  accentCut: document.querySelector('.piece-accent')?.classList.contains('is-cut'),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}))
console.log('arabic:', JSON.stringify(ar))
ok(ar.t1 === 'توقيعك،', 'ar t1')
ok(ar.t2.replace(/\s+/g, ' ') === 'في كل غرزة.', 'ar t2')
ok(ar.accentCut, 'ar accent underline kept')
ok(ar.overflow <= 0, 'no overflow ar')
await page.screenshot({ path: 'shots/h3-arabic.png' })
await switchLanguage(page, 'fa')

/* responsive widths */
for (const w of [360, 390, 768, 1024, 1280, 1920]) {
  const p = await newPage(w, 900, w < 500)
  await p.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await p.waitForFunction(settled, { timeout: 20000 })
  await sleep(1400)
  const o = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  ok(o <= 0, `overflow at ${w}: ${o}px`)
  if (w === 390) await p.screenshot({ path: 'shots/h4-mobile.png' })
  if (w === 768) await p.screenshot({ path: 'shots/h5-tablet.png' })
  if (w === 1920) await p.screenshot({ path: 'shots/h6-wide.png' })
  await p.close()
}

/* reduced motion */
const rm = await newPage(1440, 900, false, true)
await rm.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await rm.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
const rmState = await rm.evaluate(() => ({
  loader: !!document.querySelector('#loader'),
  pieces: [...document.querySelectorAll('.piece')].map((el) =>
    Number(getComputedStyle(el).opacity)
  ),
  accentCut: document.querySelector('.piece-accent')?.classList.contains('is-cut'),
  swatchClip: getComputedStyle(document.querySelector('.hero-swatch')).clipPath,
}))
console.log('reduced:', JSON.stringify(rmState))
ok(!rmState.loader, 'reduced: no loader')
ok(
  rmState.pieces.every((o) => o > 0.99),
  'reduced: pieces visible'
)
ok(rmState.accentCut, 'reduced: underline present')
ok(rmState.swatchClip === 'none', 'reduced: swatch unclipped')
await rm.screenshot({ path: 'shots/h7-reduced.png' })
await rm.close()

/* reload with restored scroll */
const rl = await newPage(1440, 900)
await rl.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await rl.waitForFunction(settled, { timeout: 20000 })
await rl.evaluate(() => window.scrollTo(0, 2600))
await sleep(800)
await rl.reload({ waitUntil: 'load' })
await rl.waitForFunction(() => window.scrollY > 2000, { timeout: 8000 })
await rl.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
await sleep(400)
const rlState = await rl.evaluate(() => ({
  y: window.scrollY,
  pieces: [...document.querySelectorAll('.piece')].map((el) =>
    Number(getComputedStyle(el).opacity)
  ),
  accentCut: document.querySelector('.piece-accent')?.classList.contains('is-cut'),
}))
console.log('reload:', JSON.stringify(rlState))
ok(rlState.y > 2000, 'reload kept scroll')
ok(
  rlState.pieces.every((o) => o > 0.99),
  'reload: no hidden re-run'
)
ok(rlState.accentCut, 'reload: underline present')
await rl.close()

await browser.close()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO CONSOLE / PAGE / REQUEST ERRORS')
console.log(fails.length ? `FAILS:\n${fails.join('\n')}` : 'ALL HERO CHECKS PASSED')
process.exit(fails.length || errors.length ? 1 : 0)
