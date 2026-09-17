/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Production-only hardening: inject a Content-Security-Policy meta tag into the
// built index.html. Kept out of dev so Vite HMR / React fast-refresh (which use
// inline scripts) keep working. The production bundle is pure external module
// scripts + stylesheet, so 'self' + inline styles is sufficient.
function cspPlugin(): Plugin {
  const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://dummyjson.com",
    "img-src 'self' data:",
    'object-src none',
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta name="viewport"',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="viewport"`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    restoreMocks: true,
  },
})