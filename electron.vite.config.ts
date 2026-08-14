import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // electron-vite 는 lib 출력 청크 이름을 입력 파일명(main.ts → main.js)으로 짓는다.
  // package.json 의 main 필드(out/main/index.js)와 맞추려면 입력 이름을 index 로 직접 지정해야 한다.
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main.ts') },
        // 네이티브 모듈은 번들에 넣을 수 없다 — .node 바이너리를 런타임에 require 해야 한다
        external: ['@lydell/node-pty'],
      },
    },
  },
  // preload 도 같은 이유로 index 로 고정한다.
  // 형식은 CJS 여야 한다 — 샌드박스가 켜진 렌더러는 ESM preload 를 아예 로드하지 않는다.
  // (package.json 의 "type": "module" 때문에 확장자도 .cjs 로 못 박아야 한다)
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
    // electron-vite 는 src/renderer/index.html 만 자동 탐색한다.
    // 우리 src/ 는 FSD 레이어를 담는 곳이라 renderer 를 형제로 두지 않고 입력을 직접 지정한다
    build: { rollupOptions: { input: resolve('index.html') } },
    resolve: { alias: { '@': resolve('src') } },
    plugins: [react(), tailwindcss()],
  },
})
