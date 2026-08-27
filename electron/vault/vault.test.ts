import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureVault, vaultArgs, vaultRoot } from './vault'

let home = ''

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'zetrem-vault-'))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('where the vault lives', () => {
  it('sits inside the app data, at a fixed place nobody is asked about', () => {
    expect(vaultRoot('/data/Zetrem')).toBe(join('/data/Zetrem', 'vault'))
  })

  it('hands the CLI the folder as an additional directory', () => {
    expect(vaultArgs('/v')).toEqual(['--add-dir', '/v'])
  })
})

describe('laying the skeleton', () => {
  it('creates the root, the marker and a CLAUDE.md, but no folders of its own', async () => {
    const root = join(home, 'Vault')
    await ensureVault(root)
    expect(existsSync(join(root, '.zetrem'))).toBe(true)
    const guide = readFileSync(join(root, 'CLAUDE.md'), 'utf8')
    expect(guide).toContain('[[')
    const { readdirSync } = await import('node:fs')
    const dirs = readdirSync(root, { withFileTypes: true }).filter((one) => one.isDirectory())
    expect(dirs).toEqual([])
  })

  it('is idempotent and never rewrites a CLAUDE.md the person edited', async () => {
    const root = join(home, 'Vault')
    await ensureVault(root)
    const mine = '# my own rules\n'
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(root, 'CLAUDE.md'), mine)
    await ensureVault(root)
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe(mine)
  })

  it('does not bring back a CLAUDE.md the person deleted on purpose', async () => {
    const root = join(home, 'Vault')
    await ensureVault(root)
    unlinkSync(join(root, 'CLAUDE.md'))
    await ensureVault(root)
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false)
  })

  it('says nothing about Obsidian, since the vault is read inside the app', async () => {
    const root = join(home, 'Vault')
    await ensureVault(root)
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).not.toContain('Obsidian')
  })
})
