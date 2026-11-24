import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { translateText } from './translate-page.mjs'
import { syncTranslations } from './sync-translations.mjs'
import test from 'node:test'
import { preparePage, readMemory } from './render-page.mjs'

const versions = [
  {
    lang: 'fa',
    path: '/',
    heading: 'به تنِ تو،',
    counter: '۰۱ / ۰۲',
    close: 'بستن',
  },
  {
    lang: 'ar',
    path: '/ar/',
    heading: 'على مقاسك،',
    counter: '٠١ / ٠٢',
    close: 'إغلاق',
  },
]
test('New Persian text and attributes get Arabic translations, including nested inline text', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'workshop-translation-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, 'ar.json')
  const memory = readMemory()
  await writeFile(file, JSON.stringify(memory))
  const requested = []
  const options = {
    file,
    directory,
    request: async (text) => {
      requested.push(text)
      return 'عربي ' + text
    },
  }
  const template =
    '<html lang="fa"><body><p>پارچه <b>تازه</b></p><img alt="پارچه"><span translate="no">اسم</span></body></html>'
  const before = preparePage(template, memory)
  assert(before.pending.length > 0)
  assert.match(before.render('ar'), /alt="پارچه"/)
  await syncTranslations(template, options)
  const saved = readMemory(file)
  for (const key of before.pending) assert.equal(saved[key][2], 'draft')
  const first = preparePage(template, saved)
  assert.deepEqual(first.pending, [])
  assert.deepEqual(requested, ['پارچه', 'تازه'])
  assert.match(first.render('ar'), /alt="عربي پارچه"/)
  assert.match(first.render('ar'), /<b>عربي تازه<\/b>/)
  assert.match(first.render('fa'), /alt="پارچه"/)
  assert.equal(await syncTranslations(template, { ...options, request: assert.fail }), 0)
  const previous = ['نسخه قدیمی', 'النسخة السابقة']
  await writeFile(file, JSON.stringify({ ...saved, brand: previous }))
  await assert.rejects(
    syncTranslations(template, {
      ...options,
      request: () => {
        throw new Error('offline')
      },
    }),
    /offline/
  )
  const offline = preparePage(template, readMemory(file))
  assert.deepEqual(offline.pending, ['brand'])
  assert.equal(offline.catalogs.ar.brand, previous[1])
  const long = 'سفارش '.repeat(150)
  const translated = await translateText(long, {
    directory,
    request: async (text) => {
      assert(Buffer.byteLength(text) <= 500)
      return text
    },
  })
  assert.equal(translated, long)
})

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const site = preparePage(read('../index.html'))
const pages = versions.map(({ lang }) => site.render(lang))

for (const [{ lang, path, heading, counter, close }, html] of versions.map((version, index) => [
  version,
  pages[index],
])) {
  test(path + ' is a complete right-to-left page with local copy and navigation', () => {
    assert(html.includes('<html lang="' + lang + '" dir="rtl">'))
    assert.match(html, /<meta name="description" content="[^"]+"/)
    assert.match(html, /<title\b[^>]*>[^<]+<\/title>/)
    assert(html.includes(heading))
    assert(html.includes(counter))
    assert(html.includes('data-collapse-label="' + close + '"'))
    assert(!html.includes('<!-- include:'))
    assert(!html.includes('{{'), 'Unresolved translation key')
    assert(html.includes('fetchpriority="high"'))
    assert.match(html, /id="loader" hidden/)

    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id))
    for (const [, id] of html.matchAll(/\shref="#([^"]+)"/g)) {
      assert(ids.has(id), 'Missing link target: #' + id)
    }

    const anchors = [
      ...html.matchAll(/<a href="([^"]+)" lang="(fa|ar)" hreflang="\2" data-lang="\2"([^>]*)>/g),
    ]
    assert.equal(anchors.length, 4)
    for (const { lang: code, path: href } of versions) {
      const links = anchors.filter(([, , linkLang]) => linkLang === code)
      assert.equal(links.length, 2)
      for (const [, target, , attributes] of links) {
        assert.equal(target, href)
        assert.equal(attributes.includes('aria-current="page"'), code === lang)
      }
    }
  })
}

test('Both pages expose the same unique section IDs and gallery assets', () => {
  const ids = pages.map((html) => [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id))
  assert.deepEqual(ids[0], ids[1])
  assert.equal(new Set(ids[0]).size, ids[0].length)
  for (const id of [
    'nav-bar',
    'hero',
    'features',
    'about',
    'process',
    'portfolio',
    'faq',
    'cta',
    'contact',
    'modal',
    'lightbox',
  ]) {
    assert(ids[0].includes(id), 'Missing section: ' + id)
  }

  const allImages = pages.map((html) => {
    const firstSlide = html.match(/<div id="gallery-grid"[^>]*>([\s\S]*?)<\/div>/)[1]
    const secondSlide = html.match(/<template id="gallery-more">([\s\S]*?)<\/template>/)[1]
    return [firstSlide, secondSlide].map((slide) => {
      const images = [...slide.matchAll(/<img src="([^"]+)" alt="([^"]+)"/g)]
      assert.equal(images.length, 4)
      return images.map(([, path, alt]) => {
        assert(alt)
        assert(slide.includes('href="' + path + '"'))
        assert(existsSync(new URL('../public' + path, import.meta.url)), path)
        return path
      })
    })
  })
  assert.deepEqual(allImages[0], allImages[1])
})

test('The Arabic page has distinct metadata and accessible Arabic labels', () => {
  const [fa, ar] = pages
  const description = (html) => html.match(/<meta name="description" content="([^"]+)"/)[1]
  assert.notEqual(description(fa), description(ar))
  assert.match(ar, /aria-label="إغلاق"/)
  assert.match(ar, /alt="بدلة زيتونية داكنة مفصّلة حسب الطلب/)
  assert.match(ar, /placeholder="مثال: أحمد علي"/)
  assert.doesNotMatch(ar, /[۰-۹]/)
})
