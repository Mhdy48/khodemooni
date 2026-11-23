import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createBrowserCheck, URL } from './helpers/browser.mjs'

const capture = process.argv.includes('--capture')
const compare = process.argv.includes('--compare')
const baselinePath = 'shots/modularization-baseline.json'
const { browser, newPage, errors } = await createBrowserCheck()
const snapshots = {}

try {
  for (const width of [390, 768, 1440]) {
    const page = await newPage(width, 900, width < 500, true)
    await page.goto(URL, { waitUntil: 'networkidle0' })
    await page.evaluate(async () => {
      await document.fonts.ready
      document.querySelector('#gallery-stage').dispatchEvent(new MouseEvent('mouseenter'))
      for (const img of document.querySelectorAll('img[src^="/images/"]')) {
        img.loading = 'eager'
        await img.decode()
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    snapshots[width] = await page.evaluate(() => {
      const properties = [
        'display',
        'position',
        'width',
        'height',
        'box-sizing',
        'overflow-x',
        'overflow-y',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
        'text-align',
        'color',
        'background-color',
        'background-image',
        'border-radius',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'box-shadow',
        'padding',
        'margin',
        'gap',
        'grid-template-columns',
        'grid-template-rows',
        'align-items',
        'justify-content',
        'opacity',
        'transform',
        'clip-path',
        'object-fit',
        'object-position',
        'z-index',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'stroke-dashoffset',
      ]
      return [...document.querySelectorAll('body *')].map((el) => {
        const style = getComputedStyle(el)
        return {
          tag: el.tagName,
          id: el.id,
          class: el.getAttribute('class'),
          text: el.children.length ? '' : el.textContent,
          styles: Object.fromEntries(properties.map((p) => [p, style.getPropertyValue(p)])),
        }
      })
    })
    await page.screenshot({
      path: `shots/modularization-${capture ? 'before' : 'after'}-${width}.png`,
      fullPage: true,
    })
    await page.close()
  }
  assert.deepEqual(errors, [], 'No browser errors')
  if (capture) {
    fs.writeFileSync(baselinePath, JSON.stringify(snapshots))
    console.log('Captured pre-refactor DOM and computed styles at 390, 768 and 1440px')
  } else if (compare) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    for (const width of Object.keys(baseline)) {
      assert.equal(snapshots[width].length, baseline[width].length, `Element count at ${width}px`)
      snapshots[width].forEach((element, index) => {
        assert.deepEqual(
          element,
          baseline[width][index],
          `Element ${index} (${element.tag}#${element.id}) at ${width}px`
        )
      })
    }
    console.log('DOM AND COMPUTED STYLES UNCHANGED at 390, 768 and 1440px')
  } else {
    for (const [width, elements] of Object.entries(snapshots)) {
      for (const id of [
        'hero',
        'features-bar',
        'about',
        'process',
        'portfolio',
        'faq',
        'contact',
      ]) {
        const element = elements.find((el) => el.id === id)
        assert(element, `Missing ${id} at ${width}px`)
        assert.equal(element.styles.opacity, '1', `${id} visible at ${width}px`)
        assert(parseFloat(element.styles.width) > 0, `${id} styled at ${width}px`)
      }
      assert.equal(elements.filter((el) => el.class?.split(' ').includes('gallery-tile')).length, 4)
    }
    console.log('MODULAR PAGE SMOKE CHECKS PASSED at 390, 768 and 1440px')
  }
} finally {
  await browser.close()
}
