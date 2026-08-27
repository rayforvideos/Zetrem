import { describe, expect, it, vi } from 'vitest'

// Node's own fetch (undici) ignores HTTP_PROXY and HTTPS_PROXY. Chromium's
// stack honours the system proxy, so the check must go through electron's
// net.fetch and never through the global.
const boundary = vi.hoisted(() => ({
  netFetched: [] as string[],
  globalFetched: [] as string[],
}))

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: () => undefined },
  net: {
    fetch: async (url: string) => {
      boundary.netFetched.push(url)
      return { ok: true, json: async () => ({ version: '9.9.9' }) }
    },
  },
}))

const { latestVersion } = await import('./cli-version')

describe('asking the registry for the latest CLI', () => {
  it('asks through the stack that honours the system proxy', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      boundary.globalFetched.push(url)
      return { ok: true, json: async () => ({ version: '0.0.1' }) }
    })
    const version = await latestVersion()
    vi.unstubAllGlobals()

    expect(version).toBe('9.9.9')
    expect(boundary.netFetched).toHaveLength(1)
    expect(boundary.globalFetched).toEqual([])
  })
})
