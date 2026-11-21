import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, sep } from 'node:path'

const directory = fileURLToPath(new URL('../src/partials/', import.meta.url))
const includes = /^[\t ]*<!-- include:([a-z0-9-]+\.html) -->\r?\n?/gm

export function composeHtml(html) {
  return html.replace(includes, (_, name) => readFileSync(resolve(directory, name), 'utf8'))
}

export default function htmlPartials() {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: composeHtml,
    },
    configureServer(server) {
      server.watcher.add(directory)
      server.watcher.on('change', (file) => {
        if (resolve(file).startsWith(resolve(directory) + sep)) {
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })
    },
  }
}
