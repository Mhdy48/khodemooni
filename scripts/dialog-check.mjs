import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { preview } from 'vite'
import { createBrowserCheck } from './helpers/browser.mjs'

test('Localized pages recover from restricted storage and interrupted dialogs', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'atelier-inbox-'))
  const former = process.env.CONSULT_DB
  process.env.CONSULT_DB = join(directory, 'test.sqlite')
  t.after(async () => {
    if (former === undefined) delete process.env.CONSULT_DB
    else process.env.CONSULT_DB = former
  })
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } })
  t.after(async () => {
    await new Promise((resolve) => server.httpServer.close(resolve))
    await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 })
  })
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
    const otherLanguage = path === '/' ? 'ar' : 'fa'
    await page.click('#mobile-menu .lang-trigger')
    const [destination] = await Promise.all([
      page.waitForNavigation(),
      page.click(`#mobile-menu [data-lang="${otherLanguage}"]`),
    ])
    assert(
      destination?.ok() || destination?.status() === 304,
      `Document response: ${destination?.status()} at ${page.url()}`
    )
    await page.waitForSelector('#loader', { hidden: true })
    assert.equal(await page.$eval('html', (el) => el.lang), otherLanguage)
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
    // Hold the first response until the dialog closes, then simulate an unconfirmed retry.
    await page.evaluate(() => {
      const original = window.fetch.bind(window)
      let attempts = 0
      window.fetch = (...args) => {
        if (++attempts === 1)
          return new Promise((_, reject) =>
            args[1].signal.addEventListener('abort', () => reject(new Error('cancelled')))
          )
        if (attempts === 2) return Promise.resolve(new Response('{}', { status: 503 }))
        return original(...args)
      }
    })
    await page.click('#form-submit')
    await page.keyboard.press('Escape')
    await page.click('#menu-open')
    await page.click('#mobile-menu .open-modal')
    // An old submission must never reset the reopened form or steal its focus.
    await new Promise((resolve) => setTimeout(resolve, 1050))
    assert(await page.$eval('#form-success', (element) => element.classList.contains('hidden')))
    await page.click('#form-submit')
    await page.waitForFunction(() => document.querySelector('#form-status').textContent.length > 0)
    assert.equal(await page.$eval('#f-phone', (el) => el.value), '۰۹۱۲۳۴۵۶۷۸۹')
    await page.click('#form-submit')
    await page.waitForSelector('#form-success:not(.hidden)')
    const db = new DatabaseSync(process.env.CONSULT_DB, { readOnly: true })
    try {
      assert.equal(
        db.prepare('SELECT phone FROM consultations ORDER BY rowid DESC LIMIT 1').get().phone,
        '09123456789'
      )
    } finally {
      db.close()
    }
    await page.keyboard.press('Escape')
    await page.click('#gallery-grid .gallery-tile')
    await page.keyboard.press('Escape')
    assert(
      await page.$eval('#gallery-grid .gallery-tile', (tile) => tile === document.activeElement)
    )
    await page.close()
  }
  await t.test(
    'Language selection opens a new localized document at the reading section',
    async () => {
      const page = await newPage(1440, 900)
      await page.evaluateOnNewDocument(() => {
        new MutationObserver(() => {
          if (document.querySelector('#loader[open]')) window.sawLoader = true
        }).observe(document, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['open'],
        })
      })
      await page.goto(origin + '/?ref=atelier')
      await page.waitForSelector('#loader', { hidden: true })
      await page.$eval('#portfolio', (el) => el.scrollIntoView({ behavior: 'instant' }))
      const start = await page.evaluate(() => performance.timeOrigin)
      await page.click('#navbar .lang-trigger')
      await page.click('#navbar [data-lang="fa"]')
      assert.equal(await page.evaluate(() => performance.timeOrigin), start)
      await page.click('#navbar .lang-trigger')
      const [response] = await Promise.all([
        page.waitForNavigation(),
        page.click('#navbar [data-lang="ar"]'),
      ])
      assert(
        response?.ok() || response?.status() === 304,
        `Document response: ${response?.status()} at ${page.url()}`
      )
      await page.waitForSelector('#loader', { hidden: true })
      assert(await page.evaluate(() => window.sawLoader))
      assert.equal(page.url(), origin + '/ar/?ref=atelier#portfolio')
      assert.notEqual(await page.evaluate(() => performance.timeOrigin), start)
      assert.equal(await page.$eval('html', (el) => el.lang), 'ar')
      assert.equal(await page.$eval('#navbar [aria-current="page"]', (el) => el.lang), 'ar')
      assert(
        await page.$eval('#portfolio', (el) => {
          const rect = el.getBoundingClientRect()
          return rect.top < innerHeight && rect.bottom > 0
        })
      )
      await page.goBack()
      await page.waitForFunction(() => document.documentElement.lang === 'fa')
      assert.equal(page.url(), origin + '/?ref=atelier')
      await page.goForward()
      await page.waitForFunction(() => document.documentElement.lang === 'ar')
      await page.reload()
      assert.equal(await page.$eval('html', (el) => el.lang), 'ar')
      await page.close()
    }
  )
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
    await page.click('#navbar .lang-trigger')
    await Promise.all([page.waitForNavigation(), page.click('#navbar [hreflang="fa"]')])
    assert.equal(await page.$eval('html', (html) => html.lang), 'fa')
    await page.close()
  })
})
