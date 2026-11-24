import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import lockfile from 'proper-lockfile'
import { preparePage, readMemory, memoryFile } from './render-page.mjs'
import { translateText } from './translate-page.mjs'

const defaultFile = fileURLToPath(memoryFile)
const templateFile = new URL('../index.html', import.meta.url)

// Merge only the entries observed by this editor. A newer edit or a manual correction wins.
async function saveUpdates(file, original, updates) {
  const release = await lockfile.lock(file, {
    retries: { retries: 8, minTimeout: 30, maxTimeout: 500 },
  })
  const temporary = file + '.' + randomUUID() + '.tmp'
  try {
    const latest = readMemory(file)
    let changed = false
    for (const [key, entry] of updates) {
      if (JSON.stringify(latest[key]) !== JSON.stringify(original[key])) continue
      latest[key] = entry
      changed = true
    }
    if (changed) {
      const rows = Object.entries(latest).map(
        ([key, entry]) => '  ' + JSON.stringify(key) + ': ' + JSON.stringify(entry)
      )
      writeFileSync(temporary, '{\n' + rows.join(',\n') + '\n}\n')
      renameSync(temporary, file)
    }
  } finally {
    try {
      rmSync(temporary, { force: true })
    } finally {
      await release()
    }
  }
}

export async function syncTranslations(template, { file = defaultFile, ...options } = {}) {
  const original = readMemory(file)
  const { catalogs, pending } = preparePage(template, original)
  const updates = new Map()
  try {
    for (const key of pending) {
      const source = catalogs.fa[key]
      try {
        updates.set(key, [source, await translateText(source, options), 'draft'])
      } catch (error) {
        throw new Error(`Arabic draft pending for "${key}": ${error.message}`, { cause: error })
      }
    }
  } finally {
    if (updates.size) await saveUpdates(file, original, updates)
  }
  return updates.size
}

if (import.meta.main) {
  try {
    const count = await syncTranslations(readFileSync(templateFile, 'utf8'))
    console.log(
      count ? `Prepared ${count} Arabic drafts for review.` : 'Arabic translations are up to date.'
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
