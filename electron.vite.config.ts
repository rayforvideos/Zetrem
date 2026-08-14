import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function contentSecurityPolicy(): Plugin {
  return {
    name: 'zetrem-csp',
    transformIndexHtml(html, ctx) {
      const dev = ctx.server !== undefined
      const policy = [
        "default-src 'none'",
        dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        dev ? "connect-src 'self' ws:" : "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-src 'none'",
      ].join('; ')
      return html.replace(
        '</head>',
        `  <meta http-equiv="Content-Security-Policy" content="${policy}" />\n  </head>`,
      )
    },
  }
}

export default defineConfig({
  main: {
    resolve: { alias: { '@': resolve('src') } },
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main.ts') },
      },
    },
  },
  preload: {
    resolve: { alias: { '@': resolve('src') } },
    build: {
      rollupOptions: {
        input: { index: resolve('electron/preload.ts') },
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: '.',
    build: { rollupOptions: { input: resolve('index.html') } },
    resolve: { alias: { '@': resolve('src') } },
    plugins: [
      react({ babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] } }),
      tailwindcss(),
      contentSecurityPolicy(),
    ],
  },
})
