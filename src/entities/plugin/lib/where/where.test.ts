import { describe, expect, it } from 'vitest'
import { appliesHere, removableHere, switchableHere, whereLine } from './where'

const HERE = '/Users/sam/workspace/arch-test-app'
const ELSEWHERE = '/Users/sam/workspace/another-project'

describe('appliesHere: whether the session in this window actually loads it', () => {
  it('loads what is installed for you, in every project', () => {
    expect(appliesHere('user', null, HERE)).toBe(true)
  })

  it('loads what an organisation set, in every project', () => {
    expect(appliesHere('managed', null, HERE)).toBe(true)
  })

  it('loads the copy installed for the project you have open', () => {
    expect(appliesHere('project', HERE, HERE)).toBe(true)
  })

  it('does not load a copy installed for a different project', () => {
    expect(appliesHere('project', ELSEWHERE, HERE)).toBe(false)
  })

  it('keeps a project copy it cannot place, rather than hiding it on a guess', () => {
    expect(appliesHere('project', null, HERE)).toBe(true)
    expect(appliesHere('project', ELSEWHERE, null)).toBe(true)
  })
})

describe('whereLine: a plugin says who it belongs to', () => {
  it('calls a plugin of yours yours', () => {
    expect(whereLine('user')).toBe('for you')
  })

  it('calls the project one for this project', () => {
    expect(whereLine('project')).toBe('for this project')
  })

  it('names who put an organisation plugin there', () => {
    expect(whereLine('managed')).toBe('set by your organisation')
  })

  it('says nothing about a scope it does not know', () => {
    expect(whereLine('unknown')).toBeNull()
  })
})

describe('removableHere: only offer to remove what this window can remove', () => {
  it('lets you remove your own copy', () => {
    expect(removableHere('user', null, HERE)).toBe(true)
  })

  it('lets you remove the copy for this project', () => {
    expect(removableHere('project', HERE, HERE)).toBe(true)
  })

  it('will not offer to remove what an organisation set', () => {
    expect(removableHere('managed', null, HERE)).toBe(false)
  })
})

describe('switchableHere: an organisation plugin cannot be turned off from here', () => {
  it('will not offer a switch for one an organisation set', () => {
    expect(switchableHere('managed', null, HERE)).toBe(false)
  })

  it('offers a switch for your own and for this project', () => {
    expect(switchableHere('user', null, HERE)).toBe(true)
    expect(switchableHere('project', HERE, HERE)).toBe(true)
  })
})
