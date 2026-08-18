import { t } from '@lingui/core/macro'

export function signOutTitle(): string {
  return t`Sign out of Claude Code everywhere?`
}

export function signOutWarning(sessionLive: boolean): string {
  return sessionLive
    ? t`This signs out the Claude Code CLI itself, so every terminal, editor and app using it on this computer is signed out too. The session running here stops.`
    : t`This signs out the Claude Code CLI itself, so every terminal, editor and app using it on this computer is signed out too.`
}

export function signOutHint(sessionLive: boolean): string {
  return sessionLive
    ? t`Signing out stops the running session, and every other Claude Code on this computer.`
    : t`Signs out every Claude Code on this computer, not just Zetrem.`
}
