import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['dist/**', '.vite/**', 'shots/**', 'vibe_images/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // Puppeteer callbacks execute inside the page.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.browser },
  },
]
