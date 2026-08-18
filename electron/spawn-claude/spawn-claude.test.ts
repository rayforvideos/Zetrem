import { describe, expect, it } from 'vitest'
import { launchFor } from './spawn-claude'

const JSON_ARG = '{"scout":{"description":"finds things","prompt":"go go"}}'

describe('launchFor: running the CLI wherever it was installed', () => {
  it('runs a plain binary as itself', () => {
    expect(launchFor('/usr/local/bin/claude', ['-p'], 'darwin')).toEqual({
      command: '/usr/local/bin/claude',
      args: ['-p'],
    })
  })

  it('runs a Windows .exe as itself, since Node is happy to spawn one', () => {
    expect(launchFor('C:\\bin\\claude.exe', ['-p'], 'win32').command).toBe('C:\\bin\\claude.exe')
  })

  it('hands a .cmd to the command interpreter, which Node will not spawn directly', () => {
    const launch = launchFor('C:\\bin\\claude.cmd', ['-p'], 'win32', 'C:\\Windows\\cmd.exe')
    expect(launch.command).toBe('C:\\Windows\\cmd.exe')
    expect(launch.args).toEqual(['/d', '/s', '/c', 'C:\\bin\\claude.cmd', '-p'])
  })

  it('does the same for a .bat, whatever its case', () => {
    expect(launchFor('C:\\bin\\claude.BAT', [], 'win32').args.slice(0, 3)).toEqual([
      '/d',
      '/s',
      '/c',
    ])
  })

  it('passes an argument holding JSON through untouched, which a shell would not', () => {
    const launch = launchFor('C:\\bin\\claude.cmd', ['--agents', JSON_ARG], 'win32')
    expect(launch.args.at(-1)).toBe(JSON_ARG)
  })

  it('falls back to cmd.exe when the environment names no interpreter', () => {
    // Passing undefined would take the default, which on a Windows runner is the
    // real COMSPEC. An empty string is what an unset variable actually reads as.
    expect(launchFor('C:\\bin\\claude.cmd', [], 'win32', '').command).toBe('cmd.exe')
  })

  it('leaves a .cmd alone off Windows, where it is just a file with a name', () => {
    expect(launchFor('/opt/claude.cmd', ['-p'], 'darwin').command).toBe('/opt/claude.cmd')
  })
})
