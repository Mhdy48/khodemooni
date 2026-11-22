import assert from 'node:assert/strict'
import { URL, createBrowserCheck, sleep, switchLanguage } from './helpers/browser.mjs'

const { browser, errors, newPage } = await createBrowserCheck()

const settled = () =>
  !document.querySelector('#loader') &&
  getComputedStyle(document.querySelector('.hero-object')).clipPath === 'none' &&
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
  await desktop.waitForSelector('.hero-lining-compare[hidden]')
  await desktop.screenshot({ path: 'shots/h1-desktop.png' })
  await desktop.click('.hero-autoplay[data-playing]')
  const swatch = await desktop.$eval('.hero-stage', (el) => el.getBoundingClientRect().toJSON())
  const objectTransform = () => getComputedStyle(document.querySelector('.hero-stage')).transform
  const resting = await desktop.evaluate(objectTransform)
  await desktop.mouse.move(swatch.x + swatch.width * 0.8, swatch.y + swatch.height * 0.3)
  await desktop.waitForFunction(
    (initial) => getComputedStyle(document.querySelector('.hero-stage')).transform !== initial,
    {},
    resting
  )
  await desktop.mouse.move(0, 0)
  await desktop.waitForFunction(
    (initial) => getComputedStyle(document.querySelector('.hero-stage')).transform === initial,
    {},
    resting
  )
  await desktop.focus('.hero-detail')
  await desktop.keyboard.press('Enter')
  await desktop.waitForSelector('.hero-detail[aria-pressed="true"]')
  await desktop.waitForSelector('.hero-lens:not([hidden])')
  await desktop.waitForFunction(
    () => document.querySelector('.hero-lens img').naturalWidth === 1024
  )
  const lensPosition = () => document.querySelector('.hero-lens').style.transform
  const start = await desktop.evaluate(lensPosition)
  await desktop.keyboard.press('ArrowRight')
  const afterKey = await desktop.evaluate(lensPosition)
  assert.notEqual(afterKey, start)
  await desktop.mouse.move(swatch.x + swatch.width * 0.56, swatch.y + swatch.height * 0.61)
  assert.notEqual(await desktop.evaluate(lensPosition), afterKey)
  assert.equal(await desktop.$eval('#hero-img', (el) => getComputedStyle(el).transform), 'none')
  await desktop.screenshot({ path: 'shots/h2-suit-detail.png' })
  await desktop.keyboard.press('Escape')
  await desktop.waitForSelector('.hero-detail[aria-pressed="false"]')
  await desktop.waitForSelector('.hero-lens[hidden]')
  await desktop.click('.hero-gallery-next')
  await desktop.waitForSelector(
    '.hero-view[aria-controls="hero-lapel-detail"][aria-pressed="true"]'
  )
  assert.equal(await desktop.$eval('.hero-frame-name', (el) => el.textContent), 'یقهٔ کت')
  assert.equal(await desktop.$('.hero-frame-count'), null)
  await desktop.waitForSelector('.hero-photo[data-outgoing]', { hidden: true })
  assert.equal(
    await desktop.$eval('.hero-detail', (el) => el.getAttribute('aria-controls')),
    'hero-lapel-detail'
  )
  await desktop.focus('.hero-view[aria-pressed="true"]')
  await desktop.keyboard.press('ArrowLeft')
  await desktop.waitForSelector(
    '.hero-view[aria-controls="hero-pattern-cutting"][aria-pressed="true"]:focus'
  )
  await desktop.click('.hero-gallery-previous')
  await desktop.waitForSelector(
    '.hero-view[aria-controls="hero-lapel-detail"][aria-pressed="true"]'
  )
  await desktop.click('.hero-view[aria-controls="hero-lining-detail"]')
  await desktop.waitForSelector(
    '.hero-view[aria-controls="hero-lining-detail"][aria-pressed="true"]'
  )

  await switchLanguage(desktop, 'ar')
  assert.deepEqual(await checkHero(desktop), ['على مقاسك،', 'بأسلوبك.'])
  await desktop.click('.hero-autoplay[data-playing]')
  const viewButtons = await desktop.$$('.hero-view')
  assert.equal(viewButtons.length, 4)
  for (const button of [viewButtons[1], viewButtons[2], viewButtons[3], viewButtons[0]]) {
    await button.focus()
    await desktop.keyboard.press('Enter')
    const activeId = await button.evaluate((el) => el.getAttribute('aria-controls'))
    await desktop.waitForFunction(
      (id) => document.querySelector('[data-position="front"] img').id === id,
      {},
      activeId
    )
    await desktop.click('.hero-detail')
    await desktop.waitForSelector('.hero-lens:not([hidden])')
    await desktop.waitForFunction(
      (id) => {
        const base = document.getElementById(id)
        const lens = document.querySelector('.hero-lens img')
        return (
          lens.complete &&
          lens.naturalWidth > 0 &&
          [base.dataset.lensSrc, base.currentSrc].some((src) => src && lens.src.endsWith(src))
        )
      },
      {},
      activeId
    )
  }
  await desktop.click('.hero-detail')
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
  assert.equal(await reduced.$('.hero-autoplay[data-playing]'), null)
  const liningHandle = await reduced.$eval('.hero-lining-handle', (el) =>
    el.getBoundingClientRect().toJSON()
  )
  const stage = await reduced.$eval('.hero-stage', (el) => el.getBoundingClientRect().toJSON())
  const liningY = liningHandle.y + liningHandle.height / 2
  await reduced.touchscreen.touchStart(liningHandle.x + liningHandle.width / 2, liningY)
  await reduced.touchscreen.touchMove(stage.x + stage.width * 0.79, liningY)
  await reduced.touchscreen.touchEnd()
  await reduced.waitForFunction(
    (startX) => {
      const slider = document.querySelector('.hero-lining-slider')
      const divider = document.querySelector('.hero-lining-divider')
      return slider.valueAsNumber >= 65 && divider.getBoundingClientRect().x > startX + 70
    },
    {},
    liningHandle.x + liningHandle.width / 2
  )
  assert(await reduced.$('.hero-view[aria-controls="hero-img"][aria-pressed="true"]'))
  await reduced.click('.hero-detail')
  await reduced.waitForSelector('.hero-lens:not([hidden])')
  await reduced.waitForSelector('.hero-lining-compare[hidden]')
  const center = await reduced.evaluate(lensPosition)
  await reduced.touchscreen.tap(stage.x + stage.width * 0.22, stage.y + stage.height * 0.32)
  assert.notEqual(await reduced.evaluate(lensPosition), center)
  await reduced.tap('.hero-detail')
  await reduced.waitForSelector('.hero-lens[hidden]')
  await reduced.waitForSelector('.hero-lining-compare:not([hidden])')
  const swipeY = stage.y + stage.height * 0.5
  await reduced.touchscreen.touchStart(stage.x + stage.width * 0.19, swipeY)
  await reduced.touchscreen.touchMove(stage.x + stage.width * 0.8, swipeY)
  await reduced.touchscreen.touchEnd()
  await reduced.waitForSelector(
    '.hero-view[aria-controls="hero-lapel-detail"][aria-pressed="true"]'
  )
  await reduced.waitForSelector('.hero-lining-compare[hidden]')
  await reduced.waitForSelector('.hero-detail[aria-pressed="false"]')
  await reduced.close()

  const automatic = await newPage(1440, 900)
  await automatic.goto(URL)
  await checkHero(automatic)
  await automatic.waitForSelector(
    '.hero-view[aria-controls="hero-lapel-detail"][aria-pressed="true"]',
    { timeout: 12000 }
  )
  await automatic.click('.hero-detail')
  await automatic.waitForSelector('.hero-lens:not([hidden])')
  await automatic.evaluate(() => document.activeElement.blur())
  await automatic.mouse.move(0, 0)
  await sleep(5700)
  assert.equal(
    await automatic.$eval('.hero-view[aria-pressed="true"]', (el) =>
      el.getAttribute('aria-controls')
    ),
    'hero-lapel-detail'
  )
  await automatic.close()

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
    'Both languages, keyboard and touch lens movement, autoplay pause and scroll restoration passed.'
  )
} finally {
  await browser.close()
}
