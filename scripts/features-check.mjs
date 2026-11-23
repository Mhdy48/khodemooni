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

async function checkBackground(page) {
  const background = await page.$eval('#features', (section) => ({
    transparent: getComputedStyle(section).backgroundColor === 'rgba(0, 0, 0, 0)',
    hasCustomBackdrop: [null, '::before', '::after'].some(
      (pseudo) => getComputedStyle(section, pseudo).backgroundImage !== 'none'
    ),
    followedByAbout: section.nextElementSibling?.id === 'about',
  }))
  assert.deepEqual(background, {
    transparent: true,
    hasCustomBackdrop: false,
    followedByAbout: true,
  })
}

async function checkSeams(page) {
  const seams = await page.$$eval('#features > .features-seam', ([top, bottom]) => {
    const topRect = top.getBoundingClientRect()
    const bottomRect = bottom.getBoundingClientRect()
    const topBevel = getComputedStyle(top, '::before').clipPath
    const bottomBevel = getComputedStyle(bottom, '::before').clipPath
    const rails = [top, bottom].flatMap((seam) => [
      getComputedStyle(seam, '::after'),
      getComputedStyle(seam.querySelector('.features-seam-rail')),
    ])
    const scrollMotion =
      CSS.supports('animation-timeline: view()') &&
      matchMedia('(prefers-reduced-motion: no-preference)').matches
    return {
      decorative: [top, bottom].every((seam) => seam.getAttribute('aria-hidden') === 'true'),
      atBoundaries:
        Math.abs(topRect.top - document.getElementById('hero').getBoundingClientRect().bottom) <
          1 &&
        Math.abs(bottomRect.bottom - document.getElementById('about').getBoundingClientRect().top) <
          1,
      mirrored: topRect.height === bottomRect.height && getComputedStyle(bottom).scale === '1 -1',
      bevelled: topBevel.startsWith('polygon(') && topBevel === bottomBevel,
      layered: rails.every((rail) => rail.clipPath.startsWith('polygon(')),
      scrollMotion: rails.every((rail) =>
        scrollMotion
          ? rail.animationName === 'features-seam-depth' &&
            rail.animationTimeline === '--features-seam-view'
          : rail.animationName === 'none'
      ),
      clearance:
        document.getElementById('features-title').getBoundingClientRect().top - topRect.bottom >=
          64 &&
        bottomRect.top - document.getElementById('features-bar').getBoundingClientRect().bottom >=
          80,
    }
  })
  assert.deepEqual(seams, {
    decorative: true,
    atBoundaries: true,
    mirrored: true,
    bevelled: true,
    layered: true,
    scrollMotion: true,
    clearance: true,
  })
}

try {
  const desktop = await newPage(1440, 900)
  await desktop.goto(URL)
  const [cover, design, equipment, fabric] = await checkFeatures(desktop)
  assert(cover.width > design.width)
  assert(cover.height >= design.height + fabric.height)
  assert.equal(Math.round(design.y), Math.round(equipment.y))
  await checkBackground(desktop)
  await checkSeams(desktop)
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
    await checkBackground(mobile)
    await checkSeams(mobile)
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
