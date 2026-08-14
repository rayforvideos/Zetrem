import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main.ts') },
        external: ['@lydell/node-pty'],
      },
    },
  },
  preload: {
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
    plugins: [react(), tailwindcss()],
  },
})
