import { describe, expect, it } from 'vitest'
import { readCatalog, readMarketplaces, splitId } from './catalog'

const real = {
  installed: [
    {
      id: 'frontend-design@claude-plugins-official',
      version: 'unknown',
      scope: 'user',
      enabled: true,
      installPath: '/Users/sam/.claude/plugins/cache/claude-plugins-official/frontend-design/unknown',
      installedAt: '2026-03-23T04:03:10.735Z',
      lastUpdated: '2026-08-14T13:11:36.817Z',
    },
    {
      id: 'humanize-korean@im-not-ai',
      version: '2.1.0',
      scope: 'user',
      enabled: false,
    },
  ],
  available: [
    {
      pluginId: '42crunch-api-security-testing@claude-plugins-official',
      name: '42crunch-api-security-testing',
      description: 'Automate API security directly in Claude Code',
      installCount: 12,
      marketplaceName: 'claude-plugins-official',
      source: 'github',
    },
  ],
}

describe('splitId: separating the name from the marketplace', () => {
  it('splits on the last at sign', () => {
    expect(splitId('humanize-korean@im-not-ai')).toEqual({
      name: 'humanize-korean',
      marketplace: 'im-not-ai',
    })
  })

  it('takes the trailing part as the marketplace even when the name has an at sign', () => {
    expect(splitId('@scope/thing@market')).toEqual({ name: '@scope/thing', marketplace: 'market' })
  })

  it('keeps just the name when there is no marketplace', () => {
    expect(splitId('lonely')).toEqual({ name: 'lonely', marketplace: '' })
  })
})

describe('readCatalog: reading what the CLI gave without trusting it', () => {
  it('reads what is installed and what is available out of real output', () => {
    const catalog = readCatalog(real)
    expect(catalog.installed).toHaveLength(2)
    expect(catalog.installed[0]).toMatchObject({
      name: 'frontend-design',
      marketplace: 'claude-plugins-official',
      enabled: true,
      scope: 'user',
    })
    expect(catalog.available[0]).toMatchObject({
      name: '42crunch-api-security-testing',
      marketplace: 'claude-plugins-official',
      installCount: 12,
    })
  })

  it("version 이 'unknown' 이면 모르는 것이다 — 그렇게 적어 두지 않는다", () => {
    expect(readCatalog(real).installed[0]!.version).toBe(null)
    expect(readCatalog(real).installed[1]!.version).toBe('2.1.0')
  })

  it('reads a disabled plugin as disabled', () => {
    expect(readCatalog(real).installed[1]!.enabled).toBe(false)
  })

  it('does not fall over on output that makes no sense', () => {
    expect(readCatalog(null)).toEqual({ installed: [], available: [] })
    expect(readCatalog('nope')).toEqual({ installed: [], available: [] })
    expect(readCatalog({ installed: 'no', available: 7 })).toEqual({ installed: [], available: [] })
  })

  it('drops an entry with no id, since nothing can be done with it', () => {
    expect(readCatalog({ installed: [{ version: '1' }, real.installed[1]] }).installed).toHaveLength(1)
  })

  it('does not invent a scope it does not recognise', () => {
    expect(readCatalog({ installed: [{ id: 'a@b', scope: 'sideways' }] }).installed[0]!.scope).toBe(
      'unknown',
    )
  })
})

describe('readMarketplaces', () => {
  const raw = [
    {
      name: 'im-not-ai',
      source: 'github',
      repo: 'epoko77-ai/im-not-ai',
      installLocation: '/Users/sam/.claude/plugins/marketplaces/im-not-ai',
    },
    { name: 'local-one', source: 'path' },
  ]

  it('reads the name and where it came from', () => {
    expect(readMarketplaces(raw)[0]).toEqual({
      name: 'im-not-ai',
      source: 'github',
      origin: 'epoko77-ai/im-not-ai',
    })
  })

  it('leaves the origin empty when there is no repo', () => {
    expect(readMarketplaces(raw)[1]!.origin).toBe(null)
  })

  it('drops one with no name', () => {
    expect(readMarketplaces([{ source: 'github' }])).toEqual([])
  })

  it('reads a non-list as none', () => {
    expect(readMarketplaces(null)).toEqual([])
  })
})

describe('a plugin your organisation installed is not yours to remove', () => {
  it('reads the managed scope the CLI reports', () => {
    const catalog = readCatalog({
      installed: [{ id: 'inhouse-api@acme', version: '0.1.5', scope: 'managed', enabled: true }],
    })
    expect(catalog.installed[0]?.scope).toBe('managed')
  })

  it('still calls anything it does not recognise unknown', () => {
    const catalog = readCatalog({
      installed: [{ id: 'a@b', version: '1', scope: 'whatever', enabled: true }],
    })
    expect(catalog.installed[0]?.scope).toBe('unknown')
  })
})

describe('the CLI answers with a bare list when it is not asked what is available', () => {
  it('reads that list as the installed plugins', () => {
    const catalog = readCatalog([
      { id: 'a@b', version: '1.0.0', scope: 'user', enabled: true },
      { id: 'c@d', version: '2.0.0', scope: 'project', enabled: false },
    ])
    expect(catalog.installed).toHaveLength(2)
    expect(catalog.installed[0]?.name).toBe('a')
    expect(catalog.available).toEqual([])
  })

  it('still reads the shape with both halves', () => {
    const catalog = readCatalog({
      installed: [{ id: 'a@b', version: '1', scope: 'user', enabled: true }],
      available: [{ pluginId: 'x@y', description: 'something' }],
    })
    expect(catalog.installed).toHaveLength(1)
    expect(catalog.available).toHaveLength(1)
  })
})
