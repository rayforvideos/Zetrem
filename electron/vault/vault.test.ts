import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => process.env.ZT_TEST_USERDATA ?? '' },
  BrowserWindow: { getAllWindows: () => [] },
}))
vi.mock('../ipc/ipc', () => ({ handle: () => undefined, push: () => undefined }))
vi.mock('../store/project-memory/project-memory', () => ({ recallProject: async () => null }))

import { closeVaultMcp, ensureVault, stopFollowing, vaultRootFor, vaultSessionArgs } from './vault'

let workspace = ''
let userData = ''

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'zetrem-ws-'))
  userData = mkdtempSync(join(tmpdir(), 'zetrem-ud-'))
  process.env.ZT_TEST_USERDATA = userData
})

afterEach(async () => {
  await closeVaultMcp()
  stopFollowing()
  rmSync(workspace, { recursive: true, force: true })
  rmSync(userData, { recursive: true, force: true })
})

describe('where the vault lives', () => {
  it('sits inside the workspace, so it moves with the project', () => {
    expect(vaultRootFor('/w/proj')).toBe(join('/w/proj', '.zetrem', 'vault'))
  })
})

describe('laying the skeleton', () => {
  it('creates the root, the marker and a CLAUDE.md, and no folders of its own', async () => {
    const root = vaultRootFor(workspace)
    await ensureVault(root)
    expect(readdirSync(root).sort()).toEqual(['.zetrem', 'CLAUDE.md'])
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toContain('vault_search')
  })

  it('never rewrites a CLAUDE.md the person edited, nor brings back one they deleted', async () => {
    const root = vaultRootFor(workspace)
    await ensureVault(root)
    writeFileSync(join(root, 'CLAUDE.md'), 'mine')
    await ensureVault(root)
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe('mine')
    rmSync(join(root, 'CLAUDE.md'))
    await ensureVault(root)
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false)
  })
})

describe('what a session is handed', () => {
  it('adds the vault as a directory and an MCP config that points at a live server', async () => {
    const args = await vaultSessionArgs(workspace)
    expect(args.slice(0, 2)).toEqual(['--add-dir', vaultRootFor(workspace)])
    expect(args[2]).toBe('--mcp-config')
    const config = JSON.parse(readFileSync(args[3] as string, 'utf8'))
    const vault = config.mcpServers.vault
    expect(vault.type).toBe('http')
    expect(vault.headers.Authorization).toMatch(/^Bearer /)
    const reply = await fetch(vault.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: vault.headers.Authorization,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    const body = (await reply.json()) as { result: { tools: { name: string }[] } }
    expect(body.result.tools.map((one) => one.name)).toContain('vault_search')
  })

  it('writes an agent note through the tool, into this workspace', async () => {
    const args = await vaultSessionArgs(workspace)
    const vault = JSON.parse(readFileSync(args[3] as string, 'utf8')).mcpServers.vault
    const reply = await fetch(vault.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: vault.headers.Authorization,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'vault_write',
          arguments: { title: 'From the agent', body: 'It learned this.', tags: ['probe'] },
        },
      }),
    })
    const body = (await reply.json()) as {
      result: { isError?: boolean; content: { text: string }[] }
    }
    expect(body.result.isError).toBeUndefined()
    const written = readFileSync(join(vaultRootFor(workspace), 'From the agent.md'), 'utf8')
    expect(written).toMatch(/^source: agent$/m)
    expect(written).toMatch(/^tags: \[probe\]$/m)
    expect(written).toContain('It learned this.')
  })

  it('starts one server for the whole app and reuses it', async () => {
    const first = await vaultSessionArgs(workspace)
    const second = await vaultSessionArgs(workspace)
    expect(second[3]).toBe(first[3])
  })
})
