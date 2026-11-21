import { URL, sleep, createBrowserCheck, switchLanguage } from './helpers/browser.mjs'

const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }

const { browser, errors, newPage } = await createBrowserCheck()

const shot = async (page, path) => { const el = await page.$('#about'); await el.screenshot({ path }) }

const gotoAbout = async (page) => {
  await page.evaluate(() => document.getElementById('about').scrollIntoView({ block: 'start', behavior: 'instant' }))
  await sleep(2600)
}

/* desktop */
const page = await newPage(1440, 900)
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
const numberWidths = await page.evaluate(async () => {
  await document.fonts.ready
  const values = [...document.querySelectorAll('.stat-value')]
  window.__statSamples = []
  window.__statObserver = new MutationObserver(() => {
    window.__statSamples.push({
      text: values.map((el) => el.querySelector('.counter').textContent),
      widths: values.map((el) => parseFloat(getComputedStyle(el).width)),
    })
  })
  values.forEach((el) => window.__statObserver.observe(el.querySelector('.counter'), { childList: true, characterData: true, subtree: true }))
  return values.map((el) => parseFloat(getComputedStyle(el).width))
})
await gotoAbout(page)
await page.evaluate(() => document.querySelector('.about-stats').scrollIntoView({ block: 'center', behavior: 'instant' }))
await sleep(2400)
await page.evaluate(() => document.getElementById('about').scrollIntoView({ block: 'start', behavior: 'instant' }))
await sleep(900)

const typo = await page.evaluate(() => {
  const h = document.querySelector('.about-title')
  const cs = getComputedStyle(h)
  const masks = [...document.querySelectorAll('#about .line-mask')].map((m) => {
    const mr = m.getBoundingClientRect()
    const ir = m.querySelector('.line-inner').getBoundingClientRect()
    return { clipped: ir.top < mr.top - 1 || ir.bottom > mr.bottom + 1, innerY: getComputedStyle(m.querySelector('.line-inner')).transform }
  })
  const counters = [...document.querySelectorAll('.about-stats .counter')].map((el) => ({ got: el.textContent, want: Number(el.dataset.count).toLocaleString('fa-IR') }))
  return {
    weight: cs.fontWeight, size: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
    lead: parseFloat(getComputedStyle(document.querySelector('.about-lead')).fontSize),
    masks, counters,
    numberWeights: [...document.querySelectorAll('.stat-num')].map((el) => getComputedStyle(el).fontWeight),
    numberSpacing: [...document.querySelectorAll('.stat-value')].map((el) => parseFloat(getComputedStyle(el).letterSpacing)),
    countSamples: window.__statSamples,
    stitchProgress: Number(getComputedStyle(document.querySelector('.about-stats')).getPropertyValue('--measure-fill')),
    eyebrow: (() => {
      const eb = document.querySelector('.about-eyebrow')
      const cs = getComputedStyle(eb)
      return {
        opacity: Number(cs.opacity),
        size: parseFloat(cs.fontSize),
        weight: cs.fontWeight,
        height: eb.getBoundingClientRect().height,
        dot: getComputedStyle(eb, '::before').width,
        children: eb.children.length,
      }
    })(),
    mediaClip: getComputedStyle(document.querySelector('.about-media')).clipPath,
    stampOpacity: Number(getComputedStyle(document.querySelector('.about-stamp')).opacity),
    cardOpacity: Number(getComputedStyle(document.querySelector('.about-card')).opacity),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})
console.log('typo:', JSON.stringify({ ...typo, countSamples: typo.countSamples.length }, null, 1))
ok(typo.weight === '350', 'display weight 350')
ok(typo.size >= 40, 'display size >= 40px at 1440')
ok(typo.lh >= 1.4, 'persian line-height >= 1.4')
ok(typo.lead >= 17, 'lead >= 17px')
ok(typo.masks.every((m) => !m.clipped), 'no descender clipping in line masks')
ok(typo.masks.every((m) => m.innerY === 'none' || m.innerY === 'matrix(1, 0, 0, 1, 0, 0)'), 'headline lines revealed')
ok(typo.counters.every((c) => c.got === c.want), 'counters settled')
ok(typo.numberWeights.every((weight) => weight === '500'), 'statistics use medium-weight numbers')
ok(typo.numberSpacing.every((spacing) => spacing < 0), 'numerals use compact spacing')
ok(typo.countSamples.length > 5, 'statistics count through intermediate values')
ok(typo.countSamples.every((sample) => sample.widths.every((width, index) => Math.abs(width - numberWidths[index]) < 0.1)), 'number width stays fixed during counting')
ok(typo.stitchProgress === 1, 'fabric stitching finishes drawing')
ok(typo.eyebrow.opacity > 0.99, 'eyebrow settles')
ok(typo.eyebrow.size === 14 && typo.eyebrow.weight === '500', 'eyebrow uses restrained readable typography')
ok(typo.eyebrow.height < 40 && typo.eyebrow.dot === '5px' && typo.eyebrow.children === 1, 'eyebrow is compact with a single decorative dot')
await page.evaluate(() => window.__statObserver.disconnect())
const widthRangeStable = await page.evaluate(() => [...document.querySelectorAll('.stat-value')].every((el) => {
  const counter = el.querySelector('.counter')
  const final = counter.textContent
  const width = parseFloat(getComputedStyle(el).width)
  let stable = true
  for (let value = 0; value <= Number(counter.dataset.count); value++) {
    counter.textContent = value.toLocaleString('fa-IR')
    if (Math.abs(parseFloat(getComputedStyle(el).width) - width) > 0.1) stable = false
  }
  counter.textContent = final
  return stable
}))
ok(widthRangeStable, 'every intermediate value fits the reserved number width')
ok(typo.mediaClip === 'none', 'media clip cleared')
ok(typo.stampOpacity > 0.99, 'stamp settled')
ok(typo.cardOpacity > 0.99, 'card settled')
ok(typo.overflow <= 0, 'no overflow desktop')
await shot(page, 'shots/a1-desktop.png')

/* toggle expand / collapse */
await page.click('#about-toggle')
await sleep(800)
const open = await page.evaluate(() => ({
  aria: document.getElementById('about-toggle').getAttribute('aria-expanded'),
  rows: getComputedStyle(document.getElementById('about-more')).gridTemplateRows,
  quoteH: document.querySelector('.about-quote').getBoundingClientRect().height,
  label: document.querySelector('#about-toggle [data-copy]').textContent,
  icon: getComputedStyle(document.getElementById('about-toggle-icon')).transform,
}))
console.log('open:', JSON.stringify(open))
ok(open.aria === 'true' && open.rows !== '0px' && open.quoteH > 20, 'expand works')
ok(open.label === 'بستن', 'fa collapse label')
await shot(page, 'shots/a2-expanded.png')
await page.click('#about-toggle')
await sleep(800)
const closed = await page.evaluate(() => ({
  aria: document.getElementById('about-toggle').getAttribute('aria-expanded'),
  wrapperH: document.querySelector('#about-more > div').getBoundingClientRect().height,
  label: document.querySelector('#about-toggle [data-copy]').textContent,
}))
ok(closed.aria === 'false' && closed.wrapperH === 0, 'collapse works')
ok(closed.label === 'بیشتر درباره ما', 'fa expand label restored')

/* arabic */
await switchLanguage(page, 'ar')
await gotoAbout(page)
await page.waitForFunction(() => document.querySelector('.counter').textContent === '١٢')
const ar = await page.evaluate(() => ({
  t1: document.querySelector('[data-copy="about_t1"]').textContent.trim(),
  t2: document.querySelector('[data-copy="about_t2"]').textContent.trim(),
  quote: document.querySelector('[data-copy="about_quote"]').textContent.trim(),
  counters: [...document.querySelectorAll('.about-stats .counter')].map((el) => el.textContent),
  labels: [...document.querySelectorAll('.stat-label')].map((el) => el.textContent.trim()),
  eyebrow: document.querySelector('.about-eyebrow [data-copy]').textContent.trim(),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}))
console.log('ar:', JSON.stringify(ar))
ok(ar.t1 === 'كل سنتيمتر،', 'ar t1')
ok(ar.t2 === 'قرارٌ مدروس.', 'ar t2')
ok(ar.quote === 'الثوب الجيد لا يُرى، بل يُحَس.', 'ar quote')
ok(ar.overflow <= 0, 'no overflow ar')
ok(ar.counters.join(',') === '١٢,٢٤٠,١٨٠,٩٨', 'Arabic counters use Arabic digits')
ok(ar.labels.every((label, index) => label !== ['سال تجربه', 'پروژه سازمانی', 'برند همکار', 'رضایت مشتری'][index]), 'all statistic labels switch to Arabic')
ok(ar.eyebrow === 'عن خيّاط خودموني', 'eyebrow switches to Arabic')
await shot(page, 'shots/a3-arabic.png')
await switchLanguage(page, 'fa')
await page.close()

/* mobile + tablet */
for (const w of [390, 768]) {
  const p = await newPage(w, 844, w < 500)
  await p.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await p.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
  await gotoAbout(p)
  await p.evaluate(() => document.querySelector('.about-stats').scrollIntoView({ block: 'center', behavior: 'instant' }))
  await sleep(2300)
  await p.evaluate(() => document.getElementById('about').scrollIntoView({ block: 'start', behavior: 'instant' }))
  await sleep(500)
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(o <= 0, `overflow at ${w}`)
  await shot(p, `shots/a4-${w}.png`)
  await p.close()
}

/* reduced motion */
const rm = await newPage(1440, 900, false, true)
await rm.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await gotoAbout(rm)
const rmState = await rm.evaluate(() => ({
  lines: [...document.querySelectorAll('#about .line-inner')].map((el) => getComputedStyle(el).transform),
  mediaClip: getComputedStyle(document.querySelector('.about-media')).clipPath,
  stamp: Number(getComputedStyle(document.querySelector('.about-stamp')).opacity),
  counters: [...document.querySelectorAll('.about-stats .counter')].map((el) => el.textContent),
  stitchProgress: Number(getComputedStyle(document.querySelector('.about-stats')).getPropertyValue('--measure-fill')),
  eyebrowOpacity: Number(getComputedStyle(document.querySelector('.about-eyebrow')).opacity),
}))
ok(rmState.lines.every((t) => t === 'none'), 'reduced: lines visible')
ok(rmState.mediaClip === 'none', 'reduced: media visible')
ok(rmState.stamp > 0.99, 'reduced: stamp visible')
ok(rmState.counters.join(',') === '۱۲,۲۴۰,۱۸۰,۹۸', 'reduced: counters instant')
ok(rmState.stitchProgress === 1, 'reduced: stitching complete without animation')
ok(rmState.eyebrowOpacity > 0.99, 'reduced: eyebrow visible without animation')
await rm.close()

/* reload with restored scroll at about */
const rl = await newPage(1440, 900)
await rl.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await rl.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
await rl.evaluate(() => document.querySelector('.about-stats').scrollIntoView({ block: 'center', behavior: 'instant' }))
await sleep(700)
await rl.reload({ waitUntil: 'load' })
await rl.waitForFunction(() => window.scrollY > 500, { timeout: 8000 })
await rl.waitForFunction(() => !document.querySelector('#loader'), { timeout: 20000 })
await sleep(2300)
const rlState = await rl.evaluate(() => ({
  y: window.scrollY,
  lines: [...document.querySelectorAll('#about .line-inner')].map((el) => getComputedStyle(el).transform),
  card: Number(getComputedStyle(document.querySelector('.about-card')).opacity),
  counters: [...document.querySelectorAll('.about-stats .counter')].map((el) => el.textContent),
  stitchProgress: Number(getComputedStyle(document.querySelector('.about-stats')).getPropertyValue('--measure-fill')),
  eyebrowOpacity: Number(getComputedStyle(document.querySelector('.about-eyebrow')).opacity),
}))
ok(rlState.y > 500, 'reload kept scroll at about')
ok(rlState.lines.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'), 'reload: no hidden headline')
ok(rlState.card > 0.99, 'reload: card visible')
ok(rlState.counters.join(',') === '۱۲,۲۴۰,۱۸۰,۹۸', 'reload: counters stay complete')
ok(rlState.stitchProgress === 1, 'reload: stitching stays complete')
ok(rlState.eyebrowOpacity > 0.99, 'reload: eyebrow stays visible')
await rl.close()

await browser.close()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO CONSOLE / PAGE / REQUEST ERRORS')
console.log(fails.length ? `FAILS:\n${fails.join('\n')}` : 'ALL ABOUT CHECKS PASSED')
process.exit(fails.length || errors.length ? 1 : 0)
