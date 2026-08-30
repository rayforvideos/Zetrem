import { describe, expect, it } from 'vitest'
import { configDirOf, labelPathOf, oauthAccountOf, rowOf, withOauthAccount } from './claude-json'

describe('configDirOf', () => {
  it('honours CLAUDE_CONFIG_DIR and falls back to ~/.claude', () => {
    expect(configDirOf({ CLAUDE_CONFIG_DIR: '/x/cfg' }, '/home/me')).toBe('/x/cfg')
    expect(configDirOf({ CLAUDE_CONFIG_DIR: '' }, '/home/me')).toBe('/home/me/.claude')
    expect(configDirOf({}, '/home/me')).toBe('/home/me/.claude')
  })
})

describe('labelPathOf', () => {
  it('is ~/.claude.json in the home root, not inside ~/.claude, when nothing is set', () => {
    expect(labelPathOf({}, '/home/me')).toBe('/home/me/.claude.json')
    expect(labelPathOf({ CLAUDE_CONFIG_DIR: '' }, '/home/me')).toBe('/home/me/.claude.json')
  })
  it('moves into CLAUDE_CONFIG_DIR when that is set, where the CLI then keeps it', () => {
    expect(labelPathOf({ CLAUDE_CONFIG_DIR: '/x/cfg' }, '/home/me')).toBe('/x/cfg/.claude.json')
  })
  it('is never the config dir’s own .claude.json while nothing is set', () => {
    expect(labelPathOf({}, '/home/me')).not.toBe(`${configDirOf({}, '/home/me')}/.claude.json`)
  })
})

describe('oauthAccountOf', () => {
  it('reads the oauthAccount key and nothing else', () => {
    const text = JSON.stringify({ a: 1, oauthAccount: { emailAddress: 'x@y.z' } })
    expect(oauthAccountOf(text)).toEqual({ emailAddress: 'x@y.z' })
  })
  it('is null for a missing file, missing key or broken JSON', () => {
    expect(oauthAccountOf(null)).toBeNull()
    expect(oauthAccountOf('{"a":1}')).toBeNull()
    expect(oauthAccountOf('{nope')).toBeNull()
  })
})

describe('withOauthAccount', () => {
  it('replaces only oauthAccount and keeps the other keys', () => {
    const before = JSON.stringify({ a: 1, oauthAccount: { emailAddress: 'old' }, z: [1] })
    const after = JSON.parse(withOauthAccount(before, { emailAddress: 'new' }))
    expect(after).toEqual({ a: 1, oauthAccount: { emailAddress: 'new' }, z: [1] })
  })
  it('removes the key when the value is null', () => {
    const before = JSON.stringify({ a: 1, oauthAccount: { emailAddress: 'old' } })
    expect(JSON.parse(withOauthAccount(before, null))).toEqual({ a: 1 })
  })
  it('starts from an empty object when the file is missing or broken', () => {
    expect(JSON.parse(withOauthAccount(null, { x: 1 }))).toEqual({ oauthAccount: { x: 1 } })
    expect(JSON.parse(withOauthAccount('{nope', { x: 1 }))).toEqual({ oauthAccount: { x: 1 } })
  })
  it('writes two-space indented JSON like Claude Code does', () => {
    expect(withOauthAccount('{}', { x: 1 })).toBe('{\n  "oauthAccount": {\n    "x": 1\n  }\n}')
  })
})

describe('withOauthAccount: the account’s own caches do not outlive it', () => {
  const OBSERVED = [
    'modelAccessCache',
    'orgModelDefaultCache',
    'additionalModelOptionsCache',
    'additionalModelCostsCache',
    's1mAccessCache',
    'hasAvailableSubscription',
    'cachedUsageUtilization',
    'cachedExtraUsageDisabledReason',
    'overageCreditGrantCache',
    'fableOverageConsent',
    'passesEligibilityCache',
    'passesLastSeenRemaining',
    'passesLastSeenCampaign',
    'subscriptionNoticeCount',
    'penguinModeOrgEnabled',
    'groveConfigCache',
    'metricsStatusCache',
    'clientDataCacheSlots',
    'autoCompactWindowsCache',
  ]

  function written(before: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(
      withOauthAccount(JSON.stringify(before), { emailAddress: 'next@y.z' }),
    ) as Record<string, unknown>
  }

  it('drops every key a real file was seen to keep for the account that was signed in', () => {
    const before = Object.fromEntries(OBSERVED.map((key) => [key, 'account A']))
    expect(Object.keys(written(before))).toEqual(['oauthAccount'])
  })

  it('drops a cache the CLI has not invented yet, by the shape of its name', () => {
    const before = {
      somethingNewCache: 1,
      cachedExperimentSlowThinking: 1,
      cachedGrowthBookFeatures: 1,
      cachedGrowthBookFeaturesAt: 1,
    }
    expect(Object.keys(written(before))).toEqual(['oauthAccount'])
  })

  it('leaves the project history alone, which the user would miss', () => {
    const projects = { '/Users/me/work': { history: ['hello'] } }
    expect(written({ projects }).projects).toEqual(projects)
  })

  it('leaves what belongs to this machine rather than to whoever is signed in', () => {
    const machine = {
      numStartups: 12,
      installMethod: 'native',
      autoUpdates: true,
      hasCompletedOnboarding: true,
      theme: 'dark',
      mcpServers: {},
      cachedChangelog: 'what changed in 2.0',
    }
    const kept = written(machine)
    for (const [key, value] of Object.entries(machine)) expect(kept[key]).toEqual(value)
  })

  it('drops them even when the account is being cleared away entirely', () => {
    const before = JSON.stringify({ modelAccessCache: 1, numStartups: 2, oauthAccount: {} })
    expect(JSON.parse(withOauthAccount(before, null))).toEqual({ numStartups: 2 })
  })
})

describe('withOauthAccount: whose account is arriving decides what goes', () => {
  const A = { accountUuid: 'uuid-a', emailAddress: 'a@y.z' }
  const B = { accountUuid: 'uuid-b', emailAddress: 'b@y.z' }
  const HELD = {
    oauthAccount: A,
    modelAccessCache: 'a',
    cachedUsageUtilization: 'a',
    somethingNewCache: 'a',
    userID: 'install-1',
    projects: { '/Users/me/work': { history: ['hello'] } },
  }

  function written(arriving: unknown): Record<string, unknown> {
    return JSON.parse(withOauthAccount(JSON.stringify(HELD), arriving)) as Record<string, unknown>
  }

  it('keeps every cache when the account already in the file is the one arriving', () => {
    // A rollback after a cancelled login, or a switch to the row the machine
    // already holds: nothing about the account moved, so nothing of its own goes.
    expect(written(A)).toEqual(HELD)
  })

  it('drops them when a different account arrives', () => {
    expect(written(B)).toEqual({ oauthAccount: B, userID: 'install-1', projects: HELD.projects })
  })

  it('keeps userID either way, since it names the install and not the login', () => {
    expect(written(A).userID).toBe('install-1')
    expect(written(B).userID).toBe('install-1')
  })

  it('keeps the project history either way', () => {
    expect(written(A).projects).toEqual(HELD.projects)
    expect(written(B).projects).toEqual(HELD.projects)
  })
})

describe('rowOf', () => {
  it('takes email, organisation and uuid from oauthAccount', () => {
    const snapshot = {
      credentials: '{"claudeAiOauth":{}}',
      oauthAccount: {
        accountUuid: 'u1',
        emailAddress: 'ray@example.com',
        organizationName: 'Org',
      },
    }
    expect(rowOf(snapshot)).toEqual({ email: 'ray@example.com', orgName: 'Org', accountUuid: 'u1' })
  })
  it('has no organisation when the name is missing', () => {
    const snapshot = {
      credentials: '{}',
      oauthAccount: { accountUuid: 'u1', emailAddress: 'a@b.c' },
    }
    expect(rowOf(snapshot)?.orgName).toBeNull()
  })
  it('is null without credentials, uuid or email', () => {
    expect(
      rowOf({ credentials: null, oauthAccount: { accountUuid: 'u', emailAddress: 'a@b' } }),
    ).toBeNull()
    expect(rowOf({ credentials: '{}', oauthAccount: { emailAddress: 'a@b' } })).toBeNull()
    expect(rowOf({ credentials: '{}', oauthAccount: { accountUuid: 'u' } })).toBeNull()
    expect(rowOf({ credentials: '{}', oauthAccount: null })).toBeNull()
  })
})
