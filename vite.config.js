import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
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
    plugins: [tailwindcss(), localizedPages(command === 'build' ? SITE_ORIGIN : undefined)],
    server: { port: 5173, host: true },
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
