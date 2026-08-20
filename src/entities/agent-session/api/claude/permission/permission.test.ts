import { describe, expect, it } from 'vitest'
import { permissionAlwaysResult } from './permission'

describe('permissionAlwaysResult: granting only what the dialog showed', () => {
  it('narrows a Bash grant to the exact command shown in the dialog', () => {
    const result = permissionAlwaysResult('Bash', { command: 'ls -la' })
    expect(result.updatedPermissions[0].rules, '한 커맨드만 봤으니 그 커맨드만 허용해야 한다').toEqual([
      { toolName: 'Bash', ruleContent: 'ls -la' },
    ])
  })

  it('falls back to a tool-wide rule when Bash has no command string', () => {
    expect(permissionAlwaysResult('Bash', {}).updatedPermissions[0].rules).toEqual([
      { toolName: 'Bash' },
    ])
    expect(permissionAlwaysResult('Bash', { command: 42 }).updatedPermissions[0].rules).toEqual([
      { toolName: 'Bash' },
    ])
    expect(permissionAlwaysResult('Bash', { command: '' }).updatedPermissions[0].rules).toEqual([
      { toolName: 'Bash' },
    ])
    expect(permissionAlwaysResult('Bash', null).updatedPermissions[0].rules).toEqual([
      { toolName: 'Bash' },
    ])
  })

  it('keeps the tool-wide rule for non-Bash tools', () => {
    const result = permissionAlwaysResult('Read', { file_path: '/etc/passwd' })
    expect(result.updatedPermissions[0].rules).toEqual([{ toolName: 'Read' }])
  })
})
