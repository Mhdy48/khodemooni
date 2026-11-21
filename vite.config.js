import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const pages = {
  fa: '/index.html',
  ar: '/ar/index.html',
}

function redirectArabicDirectory(server) {
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname !== '/ar') return next()
    response.writeHead(308, { Location: '/ar/' + url.search })
    response.end()
  })
}

function localizedPages(origin) {
  const site = origin ? new URL(origin) : null
  if (site && (!['http:', 'https:'].includes(site.protocol) || site.href !== site.origin + '/')) {
    throw new Error('SITE_ORIGIN must be an HTTP(S) origin without a path.')
  }

  const routes = { fa: '/', ar: '/ar/', 'x-default': '/' }
  return {
    name: 'localized-pages',
    configureServer: redirectArabicDirectory,
    configurePreviewServer: redirectArabicDirectory,
    transformIndexHtml(_html, { path }) {
      const language = Object.keys(pages).find((key) => pages[key] === path)
      if (!site || !language) return
      const url = (route) => new URL(route, site).href
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: url(routes[language]) }, injectTo: 'head' },
        ...Object.entries(routes).map(([hreflang, route]) => ({
          tag: 'link',
          attrs: { rel: 'alternate', hreflang, href: url(route) },
          injectTo: 'head',
        })),
      ]
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const { SITE_ORIGIN } = loadEnv(mode, process.cwd(), 'SITE_')
  return {
    appType: 'mpa',
    plugins: [tailwindcss(), localizedPages(command === 'build' ? SITE_ORIGIN : undefined)],
    server: { port: 5173, host: true },
    build: {
      rollupOptions: {
        input: Object.fromEntries(Object.entries(pages).map(([language, path]) => [
          language, fileURLToPath(new URL('.' + path, import.meta.url)),
        ])),
      },
    },
  }
})
