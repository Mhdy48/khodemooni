import { URL, sleep, createBrowserCheck, switchLanguage } from './helpers/browser.mjs'

const { browser, errors, newPage } = await createBrowserCheck()

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.7
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 260))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 500))
  })
}

/* ---------- desktop ---------- */
const page = await newPage(1440, 900)
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await page.waitForFunction(
  () =>
    !document.querySelector('#loader') &&
    [...document.querySelectorAll('.hero-in')].every(
      (el) => Number(getComputedStyle(el).opacity) > 0.99
    )
)
await page.screenshot({ path: 'shots/01-hero.png' })

await scrollThrough(page)
await sleep(800)
await page.screenshot({ path: 'shots/02-full.png', fullPage: true })

// gallery next
await page.evaluate(() => document.getElementById('portfolio').scrollIntoView())
await sleep(1200)
await page.click('#gallery-next')
await sleep(1100)
await page.screenshot({ path: 'shots/03-gallery-slide2.png' })

// lightbox
await page.click('#gallery-grid .gallery-tile:nth-child(3)')
await sleep(800)
await page.screenshot({ path: 'shots/04-lightbox.png' })
await page.click('#lightbox-next')
await sleep(600)
await page.keyboard.press('Escape')
await sleep(500)

// faq
await page.evaluate(() => document.getElementById('faq').scrollIntoView())
await sleep(1000)
const qs = await page.$$('.faq-q')
await qs[2].click()
await sleep(700)
await page.screenshot({ path: 'shots/05-faq.png' })

// modal: invalid then valid
await page.evaluate(() => document.querySelector('#cta .open-modal').click())
await sleep(800)
await page.click('#form-submit')
await sleep(600)
await page.screenshot({ path: 'shots/06-modal-errors.png' })
await page.type('#f-name', 'مهدی رضایی')
await page.type('#f-phone', '۰۹۱۲۳۴۵۶۷۸۹')
await page.select('#f-service', 'bulk')
await page.click('#form-submit')
await sleep(1600)
await page.screenshot({ path: 'shots/07-modal-success.png' })
await page.click('#success-close')
await sleep(500)

// about read-more
await page.evaluate(() => document.getElementById('about').scrollIntoView())
await sleep(900)
await page.click('#about-toggle')
await sleep(800)
await page.screenshot({ path: 'shots/08-about-more.png' })

// arabic
await page.evaluate(() => window.scrollTo(0, 0))
await sleep(900)
await switchLanguage(page, 'ar')
await page.waitForFunction(() =>
  [...document.querySelectorAll('.hero-in')].every(
    (el) => Number(getComputedStyle(el).opacity) > 0.99
  )
)
await page.screenshot({ path: 'shots/09-arabic-hero.png' })
await page.evaluate(() => document.getElementById('services').scrollIntoView())
await sleep(900)
await page.screenshot({ path: 'shots/10-arabic-services.png' })
await switchLanguage(page, 'fa')

// navbar scrolled state + anchor offset
await page.evaluate(() => document.querySelector('.nav-link[href="#process"]').click())
await sleep(1400)
await page.screenshot({ path: 'shots/11-anchor-process.png' })
const offset = await page.evaluate(() => {
  const r = document.getElementById('process').getBoundingClientRect()
  return { top: Math.round(r.top), navH: document.getElementById('navbar').offsetHeight }
})
console.log('anchor offset:', JSON.stringify(offset))
await page.close()

/* ---------- mobile ---------- */
const m = await newPage(390, 844, true)
await m.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await m.waitForFunction(
  () =>
    !document.querySelector('#loader') &&
    [...document.querySelectorAll('.hero-in')].every(
      (el) => Number(getComputedStyle(el).opacity) > 0.99
    )
)
await m.screenshot({ path: 'shots/12-mobile-hero.png' })
await m.click('#menu-open')
await sleep(800)
await m.screenshot({ path: 'shots/13-mobile-menu.png' })
await m.evaluate(() => document.querySelector('#mobile-menu a[href="#services"]').click())
await sleep(1400)
await m.screenshot({ path: 'shots/14-mobile-services.png' })
await scrollThrough(m)
await sleep(700)
await m.screenshot({ path: 'shots/15-mobile-full.png', fullPage: true })
const hOverflow = await m.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
)
console.log('mobile horizontal overflow px:', hOverflow)
await m.close()

await browser.close()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO CONSOLE / PAGE / REQUEST ERRORS')
