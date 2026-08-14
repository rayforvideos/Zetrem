import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': resolve('src') } },
  test: {
    // 도메인 모듈은 화면 없이 돌아야 한다 — jsdom 을 쓰지 않는 것이 제약의 일부다
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
