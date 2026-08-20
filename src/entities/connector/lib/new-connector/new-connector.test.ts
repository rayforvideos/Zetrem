import { describe, expect, it } from 'vitest'
import { refusalOf, tidyName } from './new-connector'

const none: string[] = []

function draft(name: string, url: string) {
  return { name, url }
}

describe('tidyName: the name as it will be written down', () => {
  it('drops the space either side', () => {
    expect(tidyName('  sentry  ')).toBe('sentry')
  })

  it('leaves what is within alone, so it can be refused rather than quietly reshaped', () => {
    expect(tidyName('  Google Drive ')).toBe('Google Drive')
    expect(tidyName('Sen\ntry')).toContain('\n')
  })
})

describe('refusalOf: why a connector cannot be added yet', () => {
  it('takes a plain https server', () => {
    expect(refusalOf(draft('Sentry', 'https://mcp.sentry.dev/mcp'), none)).toBeNull()
  })

  it('refuses a name the CLI itself will refuse, rather than finding out afterwards', () => {
    for (const name of ['zetrem probe', 'claude.ai Figma', 'my/server', 'ünïcode']) {
      expect(refusalOf(draft(name, 'https://a.dev/mcp'), none)?.field, name).toBe('name')
    }
  })

  it('takes the shapes the CLI does allow', () => {
    for (const name of ['sentry', 'my-server', 'my_server', 'srv2']) {
      expect(refusalOf(draft(name, 'https://a.dev/mcp'), none), name).toBeNull()
    }
  })

  it('asks for a name before anything else', () => {
    expect(refusalOf(draft('   ', 'https://mcp.sentry.dev/mcp'), none)?.field).toBe('name')
  })

  it('asks for an address once the name is there', () => {
    expect(refusalOf(draft('Sentry', ''), none)?.field).toBe('url')
  })

  it('refuses a name that spans lines, which the command line reads as two arguments', () => {
    expect(refusalOf(draft('Sen\ntry', 'https://a.dev/mcp'), none)?.field).toBe('name')
  })

  it('refuses a name that opens with a dash, which reads as an option', () => {
    expect(refusalOf(draft('--transport', 'https://a.dev/mcp'), none)?.code).toBe('name-dash')
  })

  it('refuses a name already taken, since the second would replace the first', () => {
    const said = refusalOf(draft('sentry', 'https://a.dev/mcp'), ['Sentry'])
    expect(said?.field).toBe('name')
    expect(said?.code).toBe('name-taken')
  })

  it('refuses something that is not an address at all', () => {
    expect(refusalOf(draft('Sentry', 'mcp.sentry.dev'), none)?.field).toBe('url')
  })

  it('refuses a scheme that is not the web, so nothing else can be launched through it', () => {
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'ssh://box/mcp']) {
      expect(refusalOf(draft('X', url), none)?.field, url).toBe('url')
    }
  })

  it('insists on https out on the network, where plain http would be read by anyone', () => {
    expect(refusalOf(draft('X', 'http://mcp.example.com/mcp'), none)?.code).toBe('url-insecure')
  })

  it('allows plain http to a server on this machine, which never leaves it', () => {
    expect(refusalOf(draft('Local', 'http://localhost:8787/mcp'), none)).toBeNull()
    expect(refusalOf(draft('Local', 'http://127.0.0.1:8787/mcp'), none)).toBeNull()
  })

  it('keeps a very long name out, rather than passing it on to be truncated elsewhere', () => {
    expect(refusalOf(draft('n'.repeat(65), 'https://a.dev/mcp'), none)?.field).toBe('name')
  })
})
