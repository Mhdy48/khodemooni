import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

export const URL = process.env.TEST_URL || 'http://localhost:5173/'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function switchLanguage(page, language) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.click(`#navbar .lang-btn[data-lang="${language}"]`),
  ])
  await page.waitForFunction(() => !document.querySelector('#loader'))
}

export async function createBrowserCheck() {
  fs.mkdirSync('shots', { recursive: true })
  const errors = []
  const browser = await puppeteer.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=fa', '--font-render-hinting=none'],
  })

  async function newPage(width, height, mobile = false, reduced = false) {
    const page = await browser.newPage()
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
    })
    if (reduced)
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    })
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('requestfailed', (r) => errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`))
    return page
  }

  return { browser, errors, newPage }
}
