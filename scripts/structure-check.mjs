import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const versions = [
  {
    lang: 'fa',
    path: '/',
    file: '../index.html',
    heading: 'به تنِ تو،',
    counter: '۰۱ / ۰۲',
    close: 'بستن',
  },
  {
    lang: 'ar',
    path: '/ar/',
    file: '../ar/index.html',
    heading: 'على مقاسك،',
    counter: '٠١ / ٠٢',
    close: 'إغلاق',
  },
]
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const pages = versions.map(({ file }) => read(file))

for (const [{ lang, path, heading, counter, close }, html] of versions.map((version, index) => [
  version,
  pages[index],
])) {
  test(path + ' is a complete right-to-left page with local copy and navigation', () => {
    assert(html.includes('<html lang="' + lang + '" dir="rtl">'))
    assert.match(html, /<meta name="description" content="[^"]+"/)
    assert.match(html, /<title>[^<]+<\/title>/)
    assert(html.includes(heading))
    assert(html.includes(counter))
    assert(html.includes('data-collapse-label="' + close + '"'))
    assert(!html.includes('<!-- include:'))
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
