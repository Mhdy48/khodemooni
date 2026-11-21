import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import htmlPartials, { composeHtml } from '../build/html-partials.js'
import { slides } from '../src/data/gallery.js'
import { ar, arPlaceholders } from '../src/locales/ar.js'
import { faDynamic } from '../src/locales/fa.js'

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('Every page partial is composed once into static HTML', () => {
  const names = [...template.matchAll(/<!-- include:([a-z0-9-]+\.html) -->/g)].map((match) => match[1])
  const files = readdirSync(new URL('../src/partials/', import.meta.url)).filter((name) => name.endsWith('.html'))
  assert.deepEqual([...names].sort(), files.sort())
  assert.equal(new Set(names).size, names.length)
  const html = composeHtml(template)
  assert(!html.includes('<!-- include:'))
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ['navbar', 'hero', 'features', 'about', 'services', 'process', 'portfolio', 'faq', 'cta', 'contact', 'modal', 'lightbox']) {
    assert(ids.includes(id), `Missing mount: ${id}`)
  }
  assert(html.includes('fetchpriority="high"'))
  assert(html.includes('<noscript>'))
})

test('Partials are expanded before Vite parses HTML and reload on editing', () => {
  const plugin = htmlPartials()
  assert.equal(plugin.transformIndexHtml.order, 'pre')
  assert.equal(plugin.transformIndexHtml.handler(template), composeHtml(template))
  let directory, changed
  const messages = []
  plugin.configureServer({
    watcher: {
      add: (path) => { directory = path },
      on: (event, handler) => { assert.equal(event, 'change'); changed = handler },
    },
    ws: { send: (message) => messages.push(message) },
  })
  changed(resolve(directory, 'hero.html'))
  changed(resolve(directory, '../unrelated.html'))
  assert.deepEqual(messages, [{ type: 'full-reload', path: '*' }])
})

test('Gallery layout data and locale markup retain their contracts', () => {
  assert.equal(slides.length, 2)
  assert(slides.every((slide) => slide.length === 4))
  for (const item of slides.flat()) {
    assert(item.src && item.fa && item.ar && item.cls)
  }
  assert(ar.hero_t2.includes('piece-accent'))
  assert(ar.about_t2.includes('about-em'))
  assert(arPlaceholders.md_name_ph && arPlaceholders.md_msg_ph)
  assert.equal(faDynamic.about_less, 'بستن')
})
