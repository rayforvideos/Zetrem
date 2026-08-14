import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backdropStore } from './backdrop-store'

const profile = { cols: 1, rows: 1, cells: [0.5] }

beforeEach(() => {
  backdropStore.set(null)
})

describe('backdropStore', () => {
  it('배경을 넣으면 읽힌다', () => {
    backdropStore.set({ url: 'file:///a.png', profile })
    expect(backdropStore.get().backdrop?.url).toBe('file:///a.png')
  })

  it('구독자에게 변화를 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = backdropStore.subscribe(listener)
    backdropStore.set({ url: 'file:///b.png', profile })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    backdropStore.set({ url: 'file:///c.png', profile })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('변화가 없으면 같은 참조, 변화가 있으면 새 참조 — useSyncExternalStore 가 이걸로 판정한다', () => {
    const before = backdropStore.get()
    expect(backdropStore.get()).toBe(before)
    backdropStore.set({ url: 'file:///d.png', profile })
    expect(backdropStore.get()).not.toBe(before)
  })

  it('배경을 갈아치우면 앞의 blob 을 놓아준다 — 안 놓으면 바이트가 쌓인다', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    backdropStore.set({ url: 'blob:nodedata:old', profile })
    backdropStore.set({ url: 'blob:nodedata:new', profile })
    expect(revoke).toHaveBeenCalledWith('blob:nodedata:old')
    expect(revoke).not.toHaveBeenCalledWith('blob:nodedata:new')
    revoke.mockRestore()
  })

  it('blob 이 아닌 URL 은 해제 대상이 아니다', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    backdropStore.set({ url: 'file:///a.png', profile })
    backdropStore.set(null)
    expect(revoke).not.toHaveBeenCalled()
    revoke.mockRestore()
  })
})
