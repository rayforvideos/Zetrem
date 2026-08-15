import { describe, expect, it } from 'vitest'
import { brandOf } from './brand'

describe('brandOf: whose service a connector points at', () => {
  it('reads the ones already on this machine', () => {
    expect(brandOf('https://mcp.figma.com/mcp')).toBe('figma')
    expect(brandOf('https://mcp.notion.com/mcp')).toBe('notion')
    expect(brandOf('https://gmailmcp.googleapis.com/mcp/v1')).toBe('gmail')
    expect(brandOf('https://drivemcp.googleapis.com/mcp/v1')).toBe('googledrive')
    expect(brandOf('https://mcp.asana.com/v2/mcp')).toBe('asana')
  })

  it('matches on the registered domain, whatever the server is called under it', () => {
    expect(brandOf('https://anything.figma.com/mcp')).toBe('figma')
    expect(brandOf('https://figma.com/mcp')).toBe('figma')
  })

  it('does not match a domain that merely ends in the same letters', () => {
    expect(brandOf('https://notfigma.com/mcp')).toBeNull()
    expect(brandOf('https://evil-github.com.attacker.net/mcp')).toBeNull()
  })

  it('reads a local command by the package it runs, since it has no host', () => {
    expect(brandOf('npx @sentry/mcp-server')).toBe('sentry')
    expect(brandOf('npx github-mcp')).toBe('github')
  })

  it('never guesses a brand from a host it does not know', () => {
    expect(brandOf('https://mcp.example.com/mcp')).toBeNull()
    expect(brandOf('npx @playwright/mcp@latest')).toBeNull()
  })

  it('says nothing for an empty or broken address rather than throwing', () => {
    expect(brandOf('')).toBeNull()
    expect(brandOf('   ')).toBeNull()
  })
})
