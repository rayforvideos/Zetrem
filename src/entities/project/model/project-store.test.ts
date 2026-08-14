import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectStore } from './project-store'

beforeEach(() => {
  projectStore.set(null)
})

describe('projectStore', () => {
  it('초기에는 프로젝트가 없다', () => {
    expect(projectStore.get()).toBeNull()
  })

  it('넣으면 읽히고 구독자에게 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = projectStore.subscribe(listener)
    projectStore.set({ path: '/repo/zetrem', name: 'zetrem' })
    expect(projectStore.get()?.name).toBe('zetrem')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    projectStore.set(null)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
