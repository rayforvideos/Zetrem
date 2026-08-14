import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LuminanceProfile } from '@/shared/lib/luminance'
import type { PickedBackdropFile } from '@/shared/api/desk'

const profile: LuminanceProfile = { cols: 1, rows: 1, cells: [0.5] }
const worker = vi.hoisted(() => ({ sampled: [] as string[], fails: false }))

vi.mock('@/shared/api/luminance-worker', () => ({
  sampleBackdropLuminance: async (url: string): Promise<LuminanceProfile> => {
    worker.sampled.push(url)
    if (worker.fails) throw new Error('디코딩 실패')
    return { cols: 1, rows: 1, cells: [0.5] }
  },
}))

const { sampled } = worker

const { pickBackdrop } = await import('./backdrop-file')

/** 파일 다이얼로그 대신 preload 창구를 세운다 — 도메인 함수가 보는 것은 이 계약뿐이다 */
function stubDesk(file: PickedBackdropFile | null): void {
  globalThis.window = {
    desk: { pickBackdropFile: async () => file, closeWindow: () => {} },
  } as unknown as Window & typeof globalThis
}

function bytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47])
}

beforeEach(() => {
  sampled.length = 0
  worker.fails = false
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})

describe('pickBackdrop', () => {
  it('고르지 않으면 null 이다', async () => {
    stubDesk(null)
    expect(await pickBackdrop()).toBeNull()
  })

  it('경로가 아니라 blob: URL 을 만든다 — http 오리진에서 file:// 은 차단된다', async () => {
    stubDesk({ bytes: bytes(), mime: 'image/png' })
    const backdrop = await pickBackdrop()
    expect(backdrop?.url.startsWith('blob:')).toBe(true)
    expect(backdrop?.url).not.toContain('file://')
  })

  it('밝기 분석에 그 blob: URL 을 그대로 넘긴다', async () => {
    stubDesk({ bytes: bytes(), mime: 'image/png' })
    const backdrop = await pickBackdrop()
    expect(sampled).toEqual([backdrop?.url])
    expect(backdrop?.profile).toEqual(profile)
  })

  it('분석이 실패하면 던지고, 붙들던 blob 을 놓아준다', async () => {
    stubDesk({ bytes: bytes(), mime: 'image/png' })
    worker.fails = true
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await expect(pickBackdrop()).rejects.toThrow('디코딩 실패')
    expect(revoke).toHaveBeenCalledWith(sampled[0])
    revoke.mockRestore()
  })
})
