import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { lingui } from '@lingui/vite-plugin'

// The demo build has no main process behind it: the page carries its own
// answers, so nothing may reach the network but the page itself.
function contentSecurityPolicy(): Plugin {
  return {
    name: 'zetrem-demo-csp',
    transformIndexHtml(html) {
      const policy = [
        "default-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
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

// A static host serves `/` as index.html, and the entry has to sit beside the
// app's own index.html in the repo, so it is renamed on the way out rather
// than kept under two names in the tree.
function indexOut(): Plugin {
  return {
    name: 'zetrem-demo-index',
    closeBundle() {
      const from = resolve('out/web/demo.html')
      const to = resolve('out/web/index.html')
      if (existsSync(from)) renameSync(from, to)
    },
  }
}

export default defineConfig({
  root: '.',
  base: './',
  resolve: { alias: { '@': resolve('src') } },
  build: {
    outDir: 'out/web',
    emptyOutDir: true,
    rollupOptions: { input: resolve('demo.html') },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          // Same order the app build uses: the macro hashes the message text
          // into its id, so it must see the source `lingui extract` saw.
          '@lingui/babel-plugin-lingui-macro',
          ['babel-plugin-react-compiler', { target: '19' }],
        ],
      },
    }),
    lingui(),
    tailwindcss(),
    contentSecurityPolicy(),
    indexOut(),
  ],
})
