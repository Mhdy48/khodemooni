import { openInbox, receiver } from './scripts/consultations.mjs'
import { readFileSync } from 'node:fs'
import { preparePage, memoryFile as arabicFile } from './scripts/render-page.mjs'
import { syncTranslations } from './scripts/sync-translations.mjs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, normalizePath } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const routes = { fa: '/', ar: '/ar/' }

function redirectArabicDirectory(server) {
  const arabicPath = server.config.base + routes.ar.slice(1)
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname !== arabicPath.slice(0, -1)) return next()
    response.writeHead(308, { Location: arabicPath + url.search })
    response.end()
  })
}

function localInbox(server) {
  let db
  let receive
  server.httpServer?.once('close', () => db?.close())
  server.middlewares.use((req, res, next) => {
    if (req.url !== '/api/consultations') return next()
    const host = req.headers.host || ''
    if (
      !/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ||
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    ) {
      res.writeHead(403).end()
      return
    }
    if (!db) {
      db = openInbox()
      receive = receiver(db, (request) => 'http://' + request.headers.host)
    }
    return receive(req, res)
  })
}

function translatedTemplate() {
  const templateFile = normalizePath(fileURLToPath(new URL('./index.html', import.meta.url)))
  const memoryFile = normalizePath(fileURLToPath(arabicFile))
  let page
  function site() {
    if (!page) {
      page = preparePage(readFileSync(templateFile, 'utf8'))
      if (page.pending.length)
        console.warn(`Arabic translations pending: ${page.pending.join(', ')}`)
    }
    return page
  }
  return {
    name: 'workshop-translations',
    configureServer(server) {
      // The development server prepares drafts even when no browser tab is open.
      let running = false
      let queued = false
      let closed = false
      async function sync() {
        queued = true
        if (running || closed) return
        running = true
        try {
          while (queued && !closed) {
            queued = false
            try {
              await syncTranslations(readFileSync(templateFile, 'utf8'))
            } catch (error) {
              server.config.logger.warn(error.message + ' — retry with npm run translate.')
            }
          }
        } finally {
          running = false
        }
      }
      const onEdit = (file) => {
        if (normalizePath(file) === templateFile) void sync()
      }
      server.watcher.on('change', onEdit)
      server.watcher.once('close', () => {
        closed = true
        server.watcher.off('change', onEdit)
      })
      void sync()
    },
    buildStart() {
      this.addWatchFile(templateFile)
      this.addWatchFile(memoryFile)
    },
    watchChange(file) {
      if (file === templateFile || file === memoryFile) page = undefined
    },
    handleHotUpdate({ file, server }) {
      if (file !== templateFile && file !== memoryFile) return
      page = undefined
      server.ws.send({ type: 'full-reload' })
      return []
    },
    transformIndexHtml: {
      order: 'pre',
      handler(_, { path }) {
        return site().render(path.replace(/index\.html$/, '') === routes.ar ? 'ar' : 'fa')
      },
    },
  }
}

function localizedPages(origin) {
  const site = origin ? new URL(origin) : null
  if (site && (!['http:', 'https:'].includes(site.protocol) || site.href !== site.origin + '/')) {
    throw new Error('SITE_ORIGIN must be an HTTP(S) origin without a path.')
  }

  const alternates = { ...routes, 'x-default': routes.fa }
  let base
  return {
    name: 'localized-pages',
    configResolved(config) {
      base = config.base
    },
    configureServer: redirectArabicDirectory,
    configurePreviewServer: redirectArabicDirectory,
    transformIndexHtml(html, { path }) {
      const route = path.replace(/index\.html$/, '')
      if (!Object.values(routes).includes(route)) return
      // Vite prefixes asset URLs, but leaves navigation and gallery links alone.
      html = html.replace(/<a href="\/(?!\/)/g, () => `<a href="${base}`)
      if (!site) return html
      const url = (route) => new URL(base + route.slice(1), site).href
      const tags = [
        { tag: 'link', attrs: { rel: 'canonical', href: url(route) }, injectTo: 'head' },
        ...Object.entries(alternates).map(([hreflang, route]) => ({
          tag: 'link',
          attrs: { rel: 'alternate', hreflang, href: url(route) },
          injectTo: 'head',
        })),
      ]
      return { html, tags }
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const { SITE_BASE, SITE_ORIGIN } = loadEnv(mode, process.cwd(), 'SITE_')
  return {
    appType: 'mpa',
    base: SITE_BASE,
    plugins: [
      {
        name: 'local-consultations',
        configureServer: localInbox,
        configurePreviewServer: localInbox,
      },
      tailwindcss(),
      translatedTemplate(),
      localizedPages(command === 'build' ? SITE_ORIGIN : undefined),
    ],
    server: { port: 5173, host: '127.0.0.1' },
    build: {
      rollupOptions: {
        input: Object.fromEntries(
          Object.entries(routes).map(([language, route]) => [
            language,
            fileURLToPath(new URL('.' + route + 'index.html', import.meta.url)),
          ])
        ),
      },
    },
  }
})
