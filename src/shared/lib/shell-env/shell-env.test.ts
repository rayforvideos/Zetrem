import { describe, expect, it } from 'vitest'
import { agentEnv } from './shell-env'

const HOST_ENV = {
  HOME: '/Users/sam',
  USER: 'ray',
  LOGNAME: 'ray',
  SHELL: '/bin/zsh',
  LANG: 'en_US.UTF-8',
  TMPDIR: '/var/folders/x/T/',
  PATH: '/usr/bin:/bin',
  SSH_AUTH_SOCK: '/var/run/com.apple.launchd/Listeners',
  ANTHROPIC_API_KEY: 'secret',
  HTTPS_PROXY: 'http://proxy.local:8080',

  ORCA_AGENT_HOOK_PORT: '62929',
  ORCA_AGENT_HOOK_TOKEN: 'tok',
  ORCA_PANE_KEY: 'pane',
  ORCA_ORIG_ZDOTDIR: '/Users/sam',
  TERM_PROGRAM: 'Orca',
  TERM_PROGRAM_VERSION: '1.4.169',
  __CFBundleIdentifier: 'com.stablyai.orca',
  AI_AGENT: 'claude-code_2-1-229_agent',
  CLAUDECODE: '1',
  CLAUDE_CODE_CHILD_SESSION: '1',
  CLAUDE_CODE_MESSAGING_SOCKET: '/tmp/cc-socks/1.sock',
  CODEX_HOME: '/Users/sam/Library/Application Support/orca/codex',
  OPENCODE_CONFIG_DIR: '/Users/sam/Library/Application Support/orca/opencode',
  DEVIN_PROJECT_DIR: '/x',

  PYENV_VERSION: '2.7.18',
  PYENV_ROOT: '/Users/sam/.pyenv',
  NVM_BIN: '/Users/sam/.nvm/versions/node/v20.19.5/bin',
  NVM_DIR: '/Users/sam/.nvm',
  SDKMAN_DIR: '/Users/sam/.sdkman',
  JAVA_HOME: '/opt/java/17',
  RBENV_SHELL: 'zsh',
  ZDOTDIR: '/Users/sam',
  FORCE_HYPERLINK: '1',
  MallocNanoZone: '0',
}

describe('agentEnv: what an agent inherits', () => {
  const env = agentEnv(HOST_ENV)

  it('keeps what belongs to the person and the system', () => {
    for (const key of ['HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'TMPDIR', 'SSH_AUTH_SOCK']) {
      expect(env[key], key).toBe(HOST_ENV[key as keyof typeof HOST_ENV])
    }
  })

  it('keeps credentials and proxies, because dropping them breaks sign-in and the office network', () => {
    expect(env.ANTHROPIC_API_KEY).toBe('secret')
    expect(env.HTTPS_PROXY).toBe('http://proxy.local:8080')
  })

  it('carries no trace of the agent host that launched this app', () => {
    for (const key of [
      'ORCA_AGENT_HOOK_PORT',
      'ORCA_AGENT_HOOK_TOKEN',
      'ORCA_PANE_KEY',
      'ORCA_ORIG_ZDOTDIR',
      'TERM_PROGRAM',
      'TERM_PROGRAM_VERSION',
      '__CFBundleIdentifier',
      'AI_AGENT',
      'CLAUDECODE',
      'CLAUDE_CODE_CHILD_SESSION',
      'CLAUDE_CODE_MESSAGING_SOCKET',
      'CODEX_HOME',
      'OPENCODE_CONFIG_DIR',
      'DEVIN_PROJECT_DIR',
    ]) {
      expect(key in env, key).toBe(false)
    }
  })

  it('drops the launching shell toolchain pins, so python does not run as 2.7', () => {
    for (const key of ['PYENV_VERSION', 'PYENV_ROOT', 'NVM_BIN', 'SDKMAN_DIR', 'RBENV_SHELL']) {
      expect(key in env, key).toBe(false)
    }
  })

  it('works by allow list, so an unknown variable does not get through', () => {
    expect('SOME_FUTURE_VENDOR_TOKEN' in agentEnv({ SOME_FUTURE_VENDOR_TOKEN: 'x' })).toBe(false)
  })

  it('lays our own settings on top, so no editor opens and blocks', () => {
    expect(env.GIT_EDITOR).toBe('true')
    expect(env.ZETREM).toBe('1')
  })

  it('uses the login shell PATH when given one, so claude is found even from Finder', () => {
    const withPath = agentEnv(HOST_ENV, '/opt/homebrew/bin:/usr/bin')
    expect(withPath.PATH).toBe('/opt/homebrew/bin:/usr/bin')
    expect(agentEnv(HOST_ENV).PATH).toBe('/usr/bin:/bin')
  })

  it('leaves empty values out, because spawn takes strings only', () => {
    expect('HOME' in agentEnv({ HOME: undefined })).toBe(false)
  })
})
