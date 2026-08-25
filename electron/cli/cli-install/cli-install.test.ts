import { describe, expect, it } from 'vitest'
import { installerCommand } from './cli-install'

describe('the one installer each platform actually has', () => {
  it('pipes the shell script through bash on macOS and Linux', () => {
    const { bin, args } = installerCommand('darwin')
    expect(bin).toBe('/bin/bash')
    expect(args.at(-1)).toContain('https://claude.ai/install.sh')
  })

  it('runs the PowerShell script on Windows, past a policy that would block it', () => {
    const { bin, args } = installerCommand('win32')
    expect(bin).toBe('powershell.exe')
    expect(args).toContain('-ExecutionPolicy')
    expect(args.at(-1)).toContain('https://claude.ai/install.ps1')
  })
})
