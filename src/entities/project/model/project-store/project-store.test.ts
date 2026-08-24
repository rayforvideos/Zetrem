import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectStore } from './project-store'

beforeEach(() => {
  projectStore.set(null)
})

describe('projectStore', () => {
  it('starts with no project', () => {
    expect(projectStore.get()).toBeNull()
  })

  it('reads back what was set and tells subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = projectStore.subscribe(listener)
    projectStore.set({ id: '/repo/zetrem', path: '/repo/zetrem', name: 'zetrem' })
    expect(projectStore.get()?.name).toBe('zetrem')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    projectStore.set(null)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
