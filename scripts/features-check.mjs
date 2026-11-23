import assert from 'node:assert/strict'
import { URL, createBrowserCheck } from './helpers/browser.mjs'

const { browser, errors, newPage } = await createBrowserCheck()
const targets = ['#services', '#service-design', '#step-sewing', '#service-fabric', '#step-quality']

async function checkFeatures(page) {
  await page.waitForFunction(() => !document.querySelector('#loader'))
  await page.$eval('#features', (el) => el.scrollIntoView({ behavior: 'instant' }))
  await page.waitForFunction(() => {
    const bar = document.getElementById('features-bar')
    const cover = bar.querySelector('.feat-cover')
    return (
      !bar.style.opacity &&
      [...bar.children].every((tile) => !tile.style.opacity) &&
      cover.complete &&
      cover.naturalWidth > 0
    )
  })
  const section = await page.$eval('#features', (el) => {
    const heading = el.querySelector('h2').getBoundingClientRect()
    return {
      separate:
        el.getBoundingClientRect().top >=
        document.querySelector('#hero').getBoundingClientRect().bottom,
      titled:
        heading.height > 0 &&
        heading.bottom < el.querySelector('.feat-link').getBoundingClientRect().top,
      motion: [...el.querySelectorAll('.feat-icon')].map((icon) =>
        icon
          .getAnimations({ subtree: true })
          .some((animation) => animation.effect.getTiming().iterations === Infinity)
      ),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
  assert(section.separate && section.titled)
  assert(section.motion.every((animated) => animated === !section.reduced))
  const cards = await page.$$eval('.feat-link', (links) =>
    links.map((link) => ({
      target: link.getAttribute('href'),
      matched: !!document.querySelector(link.getAttribute('href')),
      text: link.querySelector('.feat-label').textContent.trim(),
      note: link.querySelector('.feat-note').textContent.trim(),
      rect: link.getBoundingClientRect().toJSON(),
    }))
  )
  assert.deepEqual(
    cards.map(({ target }) => target),
    targets
  )
  assert(
    cards.every(({ matched, text, note, rect }) => matched && text && note && rect.height >= 48)
  )
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  )
  return cards.map(({ rect }) => rect)
}

async function checkBackground(page, { fixed, animated }) {
  const background = await page.$eval('#features', (section) => ({
    hasPhoto: getComputedStyle(section, '::before').backgroundImage.includes('lapel-detail.webp'),
    fixed: getComputedStyle(section, '::before').backgroundAttachment.includes('fixed'),
    animated: getComputedStyle(section, '::after').animationName === 'features-grid-drift',
    followedByAbout: section.nextElementSibling?.id === 'about',
  }))
  assert.deepEqual(background, { hasPhoto: true, fixed, animated, followedByAbout: true })
}

async function checkSeam(page, animated) {
  const seam = await page.$eval('.features-seam', (element) => {
    const glints = element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.animationName === 'features-seam-glint')
      .map((animation) => animation.effect.getTiming())

    return {
      decorative: element.getAttribute('aria-hidden') === 'true',
      atBoundary:
        Math.abs(
          element.getBoundingClientRect().top -
            document.getElementById('hero').getBoundingClientRect().bottom
        ) < 1,
      clipped: getComputedStyle(element, '::before').clipPath.startsWith('polygon('),
      corners: element.children.length,
      glintDelays: glints
        .filter(({ iterations }) => iterations === Infinity)
        .map(({ delay }) => delay),
    }
  })
  assert.deepEqual(seam, {
    decorative: true,
    atBoundary: true,
    clipped: true,
    corners: 2,
    glintDelays: animated ? [0, 1350] : [],
  })
}

try {
  const desktop = await newPage(1440, 900)
  await desktop.goto(URL)
  const [cover, design, equipment, fabric] = await checkFeatures(desktop)
  assert(cover.width > design.width)
  assert(cover.height >= design.height + fabric.height)
  assert.equal(Math.round(design.y), Math.round(equipment.y))
  await checkBackground(desktop, { fixed: true, animated: true })
  await checkSeam(desktop, true)
  await desktop.screenshot({ path: 'shots/f1-desktop.png' })
  await desktop.focus('.feat-link[href="#service-design"]')
  await desktop.keyboard.press('Enter')
  await desktop.waitForFunction(() => location.hash === '#service-design')
  await desktop.waitForFunction(
    () =>
      document.getElementById('service-design').getBoundingClientRect().top > 65 &&
      document.getElementById('service-design').getBoundingClientRect().top < innerHeight
  )
  await desktop.close()

  for (const [language, width, reduced] of [
    ['', 390, false],
    ['ar/', 390, true],
    ['', 320, true],
  ]) {
    const mobile = await newPage(width, 844, true, reduced)
    await mobile.goto(new globalThis.URL(language, URL).href)
    const [first, second, third] = await checkFeatures(mobile)
    await checkBackground(mobile, { fixed: false, animated: !reduced })
    await checkSeam(mobile, !reduced)
    assert(first.y < second.y)
    if (width > 336) {
      assert.equal(Math.round(second.y), Math.round(third.y))
      assert(first.width > second.width + third.width)
    } else {
      assert(second.y < third.y)
    }
    if (language) await mobile.screenshot({ path: 'shots/f4-arabic.png' })
    else if (width === 390) await mobile.screenshot({ path: 'shots/f3-mobile.png' })
    await mobile.close()
  }

  assert.deepEqual(errors, [])
  console.log('Features grid, localized content, keyboard navigation, and mobile layouts passed.')
} finally {
  await browser.close()
}
