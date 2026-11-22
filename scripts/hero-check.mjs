import assert from 'node:assert/strict'
import { URL, createBrowserCheck, switchLanguage } from './helpers/browser.mjs'

const { browser, errors, newPage } = await createBrowserCheck()

const settled = () =>
  !document.querySelector('#loader') &&
  getComputedStyle(document.querySelector('.hero-photo')).clipPath === 'none' &&
  !document.querySelector('.hero-title-accent').style.getPropertyValue('--hero-underline') &&
  [...document.querySelectorAll('#hero .piece, #hero .hero-in')].every(
    (el) => !el.style.transform && Number(getComputedStyle(el).opacity) === 1
  )

async function checkHero(page) {
  await page.waitForFunction(settled)
  const state = await page.$eval('#hero', (hero) => {
    const actions = [...hero.querySelectorAll('button, a')]
    const image = hero.querySelector('#hero-img')
    return {
      title: [...hero.querySelectorAll('h1 .piece')].map((line) => line.textContent.trim()),
      hasImage: image.complete && image.naturalWidth > 0,
      minHitHeight: Math.min(...actions.map((action) => action.getBoundingClientRect().height)),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  assert(state.hasImage)
  assert(state.minHitHeight >= 48)
  assert(state.horizontalOverflow <= 0)
  return state.title
}

try {
  const desktop = await newPage(1440, 900)
  await desktop.goto(URL)
  assert.deepEqual(await checkHero(desktop), ['به تنِ تو،', 'به سبکِ تو.'])
  await desktop.screenshot({ path: 'shots/h1-desktop.png' })
  await desktop.focus('.hero-detail')
  await desktop.keyboard.press('Enter')
  await desktop.waitForSelector('.hero-detail[aria-pressed="true"]')
  await desktop.waitForFunction(
    () =>
      new DOMMatrixReadOnly(getComputedStyle(document.getElementById('hero-img')).transform).a > 1.6
  )
  await desktop.screenshot({ path: 'shots/h2-suit-detail.png' })
  await desktop.keyboard.press('Enter')
  await desktop.waitForSelector('.hero-detail[aria-pressed="false"]')
  await desktop.waitForFunction(
    () =>
      new DOMMatrixReadOnly(getComputedStyle(document.getElementById('hero-img')).transform).a <
      1.01
  )

  await switchLanguage(desktop, 'ar')
  assert.deepEqual(await checkHero(desktop), ['على مقاسك،', 'بأسلوبك.'])
  await desktop.screenshot({ path: 'shots/h3-arabic.png' })
  await desktop.close()

  for (const [width, height] of [
    [320, 620],
    [390, 844],
    [768, 900],
    [1024, 900],
    [1920, 900],
  ]) {
    const responsive = await newPage(width, height, width < 500)
    await responsive.goto(URL)
    await checkHero(responsive)
    if (width === 390) await responsive.screenshot({ path: 'shots/h4-mobile.png' })
    await responsive.close()
  }

  const reduced = await newPage(390, 844, true, true)
  await reduced.goto(URL)
  await checkHero(reduced)
  await reduced.click('.hero-detail')
  await reduced.waitForSelector('.hero-swatch.is-detail')
  await reduced.close()

  const restored = await newPage(1440, 900)
  await restored.goto(URL)
  await checkHero(restored)
  await restored.evaluate(() => scrollTo({ top: 2600, behavior: 'instant' }))
  await restored.waitForFunction(() => window.scrollY > 2000)
  await restored.reload()
  await checkHero(restored)
  assert((await restored.evaluate(() => window.scrollY)) > 2000)
  await restored.close()
  assert.deepEqual(errors, [])
  console.log(
    'Both languages, viewport sizes, keyboard detail toggle and restored scrolling passed.'
  )
} finally {
  await browser.close()
}
