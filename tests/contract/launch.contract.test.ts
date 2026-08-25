import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { claudeBin, findCommand, loginPath } from '../../electron/cli/login-path/login-path'
import { launchFor } from '../../electron/spawn/spawn-claude/spawn-claude'

// This is the one thing unit tests cannot tell us: whether the way we launch the
// CLI works against the CLI as it is actually installed. On Windows npm puts a
// claude.cmd shim on the PATH, and Node will not spawn one directly, so this is
// where that fix is either true or not.
describe('the installed CLI can actually be launched the way the app launches it', () => {
  it('is found on the PATH', async () => {
    const bin = await claudeBin()
    expect(bin, 'claude was not found on the PATH').not.toBe('claude')
  })

  it('reports which kind of file it found, for the record', async () => {
    const bin = await claudeBin()
    console.log(`[launch] platform=${process.platform} resolved=${bin}`)
    expect(findCommand('claude', await loginPath())).toBe(bin)
  })

  it('answers --version when launched the app way', async () => {
    const launch = launchFor(await claudeBin(), ['--version'])
    const run = spawnSync(launch.command, launch.args, { encoding: 'utf8' })
    expect(run.error?.message ?? null, 'the spawn itself failed').toBeNull()
    expect(run.status).toBe(0)
    expect(run.stdout.trim()).toMatch(/\d+\.\d+\.\d+/)
  })

  it('keeps an argument holding JSON intact all the way to the CLI', async () => {
    // --agents carries JSON. A shell would strip its quotes; if that happened the
    // CLI would reject the spec rather than start.
    const spec = JSON.stringify({ scout: { description: 'finds things', prompt: 'say ok' } })
    const launch = launchFor(await claudeBin(), ['--agents', spec, '--help'])
    const run = spawnSync(launch.command, launch.args, { encoding: 'utf8' })
    expect(run.error?.message ?? null).toBeNull()
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/invalid|could not parse|unexpected token/i)
  })
})
