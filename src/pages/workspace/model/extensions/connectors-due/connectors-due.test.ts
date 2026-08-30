import { describe, expect, it } from 'vitest'
import { connectorsDue } from './connectors-due'

const here = { project: 'p1', account: 0 }

describe('connectorsDue: when the connector list has to be read again', () => {
  it('reads them the first time the pane wants them', () => {
    expect(connectorsDue(true, null, here)).toBe(true)
  })

  it('reads nothing while nobody is looking', () => {
    expect(connectorsDue(false, null, here)).toBe(false)
    expect(connectorsDue(false, { project: 'p2', account: 1 }, here)).toBe(false)
  })

  it('does not ask twice for the project and account it already has', () => {
    expect(connectorsDue(true, here, here)).toBe(false)
  })

  it('reads them again in another project, where the folder answers differently', () => {
    expect(connectorsDue(true, { project: 'p2', account: 0 }, here)).toBe(true)
  })

  it('reads them again after an account change, since Claude holds its own per account', () => {
    expect(connectorsDue(true, { project: 'p1', account: 0 }, { project: 'p1', account: 1 })).toBe(
      true,
    )
  })
})
