import { parse, serialize } from 'parse5'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fa } from '../src/locales/fa.js'

const token = /^\{\{(\w+)\}\}$/

// Discover ordinary Persian HTML alongside the named messages used by interactive components.
export const memoryFile = new URL('../translations/ar-memory.json', import.meta.url)
export const readMemory = (file = memoryFile) => JSON.parse(readFileSync(file, 'utf8'))

export function preparePage(template, memory = readMemory()) {
  const source = { ...fa }
  const page = parse(template)
  const persian = /[\p{Script=Arabic}&&[\p{Letter}\p{Decimal_Number}]]/v
  function mark(value) {
    if (token.test(value) || !persian.test(value)) return value
    const text = value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!Object.hasOwn(fa, key)) throw new Error('Unknown Persian message: ' + key)
      return fa[key]
    })
    const key = 'html_' + createHash('sha256').update(text).digest('hex')
    source[key] = text
    return '{{' + key + '}}'
  }
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]))
    if (
      ['script', 'style', 'code', 'pre'].includes(node.tagName) ||
      attrs.translate === 'no' ||
      attrs['data-lang'] ||
      (attrs.lang && attrs.lang !== 'fa')
    )
      return
    for (const attr of node.attrs ?? []) {
      if (
        [
          'alt',
          'title',
          'aria-label',
          'aria-description',
          'placeholder',
          'label',
          'aria-valuetext',
        ].includes(attr.name) ||
        (node.tagName === 'input' &&
          ['button', 'reset', 'submit'].includes(attrs.type) &&
          attr.name === 'value') ||
        /^data-.*-label$/.test(attr.name) ||
        (node.tagName === 'meta' &&
          attr.name === 'content' &&
          [
            'description',
            'og:title',
            'og:description',
            'twitter:title',
            'twitter:description',
          ].includes(attrs.name || attrs.property))
      )
        attr.value = mark(attr.value)
    }
    const parent = node.content ?? node
    for (const child of [...(parent.childNodes ?? [])]) {
      if (child.nodeName !== '#text') {
        visit(child)
        continue
      }
      child.value = mark(child.value)
    }
  }
  visit(page)
  const ar = {}
  const pending = []
  for (const [key, text] of Object.entries(source)) {
    const entry = memory[key]
    if (entry && (typeof entry[0] !== 'string' || typeof entry[1] !== 'string'))
      throw new Error('Invalid Arabic catalog entry: ' + key)
    if (entry?.[0] !== text) pending.push(key)
    ar[key] = entry?.[1] ?? text
  }
  const catalogs = { fa: source, ar }
  const marked = serialize(page)
  return {
    catalogs,
    pending,
    render: (language) => renderPage(marked, language, catalogs[language]),
  }
}

function renderPage(template, language, catalog) {
  function visit(node) {
    function translate(value) {
      const match = token.exec(value)
      if (!match) return value
      const key = match[1]
      if (!Object.hasOwn(catalog, key)) throw new Error(`Missing ${language} translation: ${key}`)
      return catalog[key]
    }

    for (const attr of node.attrs ?? []) {
      attr.value = translate(attr.value)
      if (node.tagName === 'html' && attr.name === 'lang') attr.value = language
    }
    if (node.attrs?.some(({ name, value }) => name === 'data-lang' && value === language))
      node.attrs.push({ name: 'aria-current', value: 'page' })

    for (const child of (node.content ?? node).childNodes ?? []) {
      if (child.nodeName === '#text') child.value = translate(child.value)
      else visit(child)
    }
  }

  const page = parse(template)
  visit(page)
  return serialize(page)
}
