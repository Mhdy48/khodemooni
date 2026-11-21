import assert from 'node:assert/strict'
import test from 'node:test'
import { preview } from 'vite'
import { createBrowserCheck } from './helpers/browser.mjs'

test('Localized pages recover from restricted storage and interrupted dialogs', async (t) => {
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } })
  t.after(() => new Promise((resolve) => server.httpServer.close(resolve)))
  const { browser, newPage, errors } = await createBrowserCheck()
  t.after(() => browser.close())
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port

  for (const path of ['/', '/ar/']) {
    const page = await newPage(390, 844, true, true)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new DOMException('Storage is unavailable', 'SecurityError')
        },
      })
    })
    await page.goto(origin + path + '#bad%')
    await page.waitForSelector('#loader', { hidden: true })
    await page.click('#menu-open')
    await page.focus('#menu-close')
    await page.keyboard.down('Shift')
    await page.keyboard.press('Tab')
    await page.keyboard.up('Shift')
    assert(
      await page.$eval('#mobile-menu .open-modal', (button) => button === document.activeElement)
    )
    await page.keyboard.press('Enter')
    await page.waitForSelector('#modal', { visible: true })
    await page.click('#form-submit')
    assert(
      await page.$eval(
        '#f-name',
        (input) => input === document.activeElement && input.getAttribute('aria-invalid') === 'true'
      )
    )
    await page.type('#f-name', 'آزمایش')
    await page.type('#f-phone', '۰۹۱۲۳۴۵۶۷۸۹')
    await page.click('#form-submit')
    await page.keyboard.press('Escape')
    await page.click('#menu-open')
    await page.click('#mobile-menu .open-modal')
    // An old submission must never reset the reopened form or steal its focus.
    await new Promise((resolve) => setTimeout(resolve, 1050))
    assert(await page.$eval('#form-success', (element) => element.classList.contains('hidden')))
    await page.keyboard.press('Escape')
    await page.click('#gallery-grid .gallery-tile')
    await page.keyboard.press('Escape')
    assert(
      await page.$eval('#gallery-grid .gallery-tile', (tile) => tile === document.activeElement)
    )
    await page.close()
  }
  assert.deepEqual(errors, [])
  await t.test('Static content stays accessible if the JavaScript bundle fails', async () => {
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (request.resourceType() === 'script') return request.abort()
      return request.continue()
    })
    await page.goto(origin + '/ar/')
    assert(await page.$eval('#loader', (loader) => getComputedStyle(loader).display === 'none'))
    await Promise.all([page.waitForNavigation(), page.click('#navbar [hreflang="fa"]')])
    assert.equal(await page.$eval('html', (html) => html.lang), 'fa')
    await page.close()
  })
})
