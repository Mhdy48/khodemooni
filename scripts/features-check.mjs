import { URL, sleep, createBrowserCheck, switchLanguage } from './helpers/browser.mjs'

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}

const { browser, errors, newPage } = await createBrowserCheck()

const shot = async (page, path) => {
  const el = await page.$('#features')
  await el.screenshot({ path })
}
const gotoFeatures = async (page, block = 'center') => {
  await page.evaluate(
    (b) => document.getElementById('features').scrollIntoView({ block: b, behavior: 'instant' }),
    block
  )
  await sleep(2600)
}
const probe = () => {
  const bar = document.getElementById('features-bar')
  const cs = (sel) => getComputedStyle(document.querySelector(sel))
  const nodes = [...document.querySelectorAll('.feat-node')].map((n) => ({
    o: Number(getComputedStyle(n).opacity),
    t: getComputedStyle(n).transform,
  }))
  const draws = [...document.querySelectorAll('.feat-icon .draw')].map(
    (p) => getComputedStyle(p).strokeDashoffset
  )
  const labels = [...document.querySelectorAll('.feat-label .line-inner')].map(
    (l) => getComputedStyle(l).transform
  )
  const notes = [...document.querySelectorAll('.feat-note')].map((n) => ({
    o: Number(getComputedStyle(n).opacity),
    h: n.getBoundingClientRect().height,
  }))
  const sc = document.querySelector('.feat-scroll')
  return {
    barOpacity: Number(getComputedStyle(bar).opacity),
    dash: Number(cs('.feat-thread-dash').opacity),
    solid: Number(cs('.feat-thread-solid').opacity),
    nodes,
    draws,
    labels,
    notes,
    shuttle: { t: cs('.feat-shuttle').transform, o: Number(cs('.feat-shuttle').opacity) },
    scrollable: sc.scrollWidth > sc.clientWidth + 4,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }
}
const identity = (t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'

/* desktop entrance + ambient shuttle */
const page = await newPage(1440, 900)
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
await gotoFeatures(page)
let p = await page.evaluate(probe)
ok(p.barOpacity > 0.99, 'bar settled opacity')
ok(p.dash === 1 && p.solid === 0, 'thread crossfaded to dashed')
ok(
  p.nodes.every((n) => n.o > 0.99 && identity(n.t)),
  'nodes popped + transform released'
)
ok(
  p.draws.every((d) => parseFloat(d) === 0),
  'icons stroke-drawn'
)
ok(p.labels.every(identity), 'labels mask-revealed')
ok(
  p.notes.every((n) => n.o === 0 && Math.round(n.h) === 25),
  'notes hidden but space reserved'
)
ok(p.overflow <= 0, 'desktop no horizontal overflow')
const s1 = p.shuttle
await sleep(800)
const s2 = (await page.evaluate(probe)).shuttle
ok(s1.t !== s2.t || s1.o !== s2.o, 'shuttle travels ambiently')
await page.evaluate(() =>
  document.getElementById('features').scrollIntoView({ block: 'start', behavior: 'instant' })
)
await sleep(500)
await shot(page, 'shots/f1-desktop.png')

/* hover: note reveal + spring + icon tint + shuttle pause */
await page.hover('.feat-station:nth-child(3) .feat-node')
await sleep(650)
const hov = await page.evaluate(() => {
  const st = document.querySelector('.feat-station:nth-child(3)')
  const node = st.querySelector('.feat-node')
  const m = new DOMMatrix(getComputedStyle(node).transform)
  return {
    note: Number(getComputedStyle(st.querySelector('.feat-note')).opacity),
    scale: m.a,
    icon: getComputedStyle(st.querySelector('.feat-icon')).color,
    shuttle: getComputedStyle(document.querySelector('.feat-shuttle')).transform,
  }
})
ok(hov.note === 1, 'hover reveals micro-copy')
ok(hov.scale > 1.03, 'hover spring lifts node')
ok(hov.icon === 'rgb(143, 97, 37)', 'hover tints icon gold')
await sleep(600)
const hov2 = await page.evaluate(
  () => getComputedStyle(document.querySelector('.feat-shuttle')).transform
)
ok(hov2 === hov.shuttle, 'shuttle pauses while hovering')
await shot(page, 'shots/f2-hover.png')
await page.mouse.move(10, 10)
await sleep(500)
const off = await page.evaluate(probe)
ok(off.notes[2].o === 0, 'note hides on leave')
await sleep(800)
const off2 = (await page.evaluate(probe)).shuttle
ok(off.shuttle.t !== off2.t || off.shuttle.o !== off2.o, 'shuttle resumes on leave')

/* keyboard focus parity */
await page.focus('.feat-station:nth-child(1)')
await sleep(450)
const kb = await page.evaluate(() => {
  const st = document.querySelector('.feat-station:nth-child(1)')
  return {
    note: Number(getComputedStyle(st.querySelector('.feat-note')).opacity),
    outline: getComputedStyle(st).outlineStyle,
  }
})
ok(kb.note === 1 && kb.outline === 'solid', 'keyboard focus reveals note + visible ring')
await page.evaluate(() => document.activeElement.blur())

/* arabic page */
await switchLanguage(page, 'ar')
await gotoFeatures(page)
const ar = await page.evaluate(() => ({
  f1: document.querySelector('[data-copy="f1"]').textContent,
  fn1: document.querySelector('[data-copy="fn1"]').textContent,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
}))
ok(ar.f1 === 'إنتاج بالجملة وللمؤسسات' && ar.fn1 === 'من طلبٍ إلى خط إنتاج', 'arabic rail texts')
ok(ar.overflow <= 0, 'arabic no overflow')
await shot(page, 'shots/f4-arabic.png')
await switchLanguage(page, 'fa')

/* mid-page reload: instant settle, no replay */
await page.evaluate(() =>
  window.scrollTo(
    0,
    document.getElementById('features').getBoundingClientRect().top + window.scrollY + 150
  )
)
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.scrollY > 500, { timeout: 8000 })
await page.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
await sleep(2200)
const rl = await page.evaluate(probe)
ok(
  rl.dash === 1 && rl.nodes.every((n) => n.o > 0.99 && identity(n.t)) && rl.labels.every(identity),
  'restored scroll settles instantly'
)
await page.close()

/* responsive widths */
for (const [w, h, mob] of [
  [360, 740, true],
  [390, 844, true],
  [768, 1024, true],
  [1024, 800, false],
  [1920, 1080, false],
]) {
  const pg = await newPage(w, h, mob)
  await pg.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await pg.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
  await gotoFeatures(pg)
  const q = await pg.evaluate(probe)
  ok(q.overflow <= 0, `width ${w} no page overflow`)
  ok(q.barOpacity > 0.99 && q.dash === 1, `width ${w} rail settled`)
  if (w < 1024) {
    ok(q.scrollable, `width ${w} rail scrolls`)
    if (mob)
      ok(
        q.notes.every((n) => n.o === 1),
        `width ${w} touch shows micro-copy`
      )
    const sl = await pg.evaluate(async () => {
      const sc = document.querySelector('.feat-scroll')
      sc.scrollLeft = -160
      await new Promise((r) => setTimeout(r, 450))
      return sc.scrollLeft
    })
    ok(sl !== 0, `width ${w} snap scroll moves`)
  } else {
    ok(!q.scrollable, `width ${w} rail fits without scroll`)
  }
  if (w === 390) {
    await pg.evaluate(() =>
      document.getElementById('features').scrollIntoView({ block: 'start', behavior: 'instant' })
    )
    await sleep(500)
    await shot(pg, 'shots/f3-mobile.png')
  }
  await pg.close()
}

/* reduced motion */
const rp = await newPage(1440, 900, false, true)
await rp.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await gotoFeatures(rp, 'start')
await sleep(600)
const rd = await rp.evaluate(probe)
ok(
  rd.dash === 1 &&
    rd.solid === 0 &&
    rd.nodes.every((n) => n.o > 0.99 && identity(n.t)) &&
    rd.labels.every(identity),
  'reduced motion instant settle'
)
const r1 = rd.shuttle
await sleep(800)
const r2 = (await rp.evaluate(probe)).shuttle
ok(r1.o === 0 && r2.o === 0 && r1.t === r2.t, 'reduced motion no shuttle')
await rp.close()

await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
if (fails.length) {
  console.log('FAILS:\n' + fails.join('\n'))
  process.exit(1)
}
console.log('ALL FEATURES CHECKS PASSED')
