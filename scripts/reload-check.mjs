import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// first load, capture very early frames
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await sleep(60)
await page.screenshot({ path: 'shots/r1-early-60ms.png' })
await sleep(140)
await page.screenshot({ path: 'shots/r2-early-200ms.png' })
await sleep(2500)

// scroll down, then reload (browser restores scroll)
await page.evaluate(() => window.scrollTo(0, 2600))
await sleep(900)
await page.screenshot({ path: 'shots/r3-scrolled-header.png', clip: { x: 0, y: 0, width: 1440, height: 220 } })
await page.reload({ waitUntil: 'domcontentloaded' })
await sleep(80)
await page.screenshot({ path: 'shots/r4-reload-80ms.png' })
await sleep(220)
await page.screenshot({ path: 'shots/r5-reload-300ms.png' })
await sleep(2000)
await page.screenshot({ path: 'shots/r6-reload-settled.png', clip: { x: 0, y: 0, width: 1440, height: 260 } })
const info = await page.evaluate(() => ({
  scrollY: window.scrollY,
  navClass: document.getElementById('navbar').className,
  navRect: document.getElementById('navbar').getBoundingClientRect().height,
}))
console.log(JSON.stringify(info))
await browser.close()