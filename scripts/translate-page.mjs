import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const cacheDirectory = fileURLToPath(new URL('../.vite/translation-segments/', import.meta.url))
const sourceId = (text) => createHash('sha256').update(text).digest('hex')

// MyMemory accepts one segment per request, up to 500 UTF-8 bytes.
function splitLongSegment(text) {
  if (Buffer.byteLength(text) <= 500) return [text]
  const chunks = []
  let chunk = ''
  for (const word of text.match(/\s+|\S+/gu)) {
    if (Buffer.byteLength(chunk + word) > 500 && chunk) {
      chunks.push(chunk)
      chunk = ''
    }
    for (const character of word) {
      if (Buffer.byteLength(chunk + character) > 500) {
        chunks.push(chunk)
        chunk = ''
      }
      chunk += character
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

export async function requestArabic(source) {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.search = new URLSearchParams({ langpair: 'fa|ar', q: source })
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`MyMemory returned HTTP ${response.status}`)
  const body = await response.json()
  const translation = body.responseData?.translatedText
  if (Number(body.responseStatus) !== 200 || body.quotaFinished || !translation?.trim())
    throw new Error(body.responseDetails || 'MyMemory returned an incomplete translation')
  return translation.trim()
}

export async function translateText(
  source,
  { directory = cacheDirectory, request = requestArabic } = {}
) {
  const sentences = new Intl.Segmenter('fa', { granularity: 'sentence' })
  async function translateSegment(text) {
    const source = text.trim()
    if (!source) return text
    const file = join(directory, sourceId(source) + '.json')
    let translation
    try {
      const entry = JSON.parse(await readFile(file, 'utf8'))
      if (
        entry.source !== source ||
        typeof entry.translation !== 'string' ||
        !entry.translation.trim()
      )
        throw new Error('Invalid translation cache entry: ' + file)
      translation = entry.translation
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      translation = await request(source)
      await mkdir(directory, { recursive: true })
      const temporary = file + '.' + randomUUID() + '.tmp'
      await writeFile(temporary, JSON.stringify({ source, translation }, null, 2) + '\n')
      await rename(temporary, file)
    }
    return text.replace(source, () => translation)
  }

  let translated = ''
  for (const { segment } of sentences.segment(source)) {
    for (const chunk of splitLongSegment(segment)) translated += await translateSegment(chunk)
  }
  return translated
}
