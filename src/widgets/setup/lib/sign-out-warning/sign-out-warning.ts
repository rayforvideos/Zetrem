import { t } from '@lingui/core/macro'

export function signOutTitle(): string {
  return t`Sign out of Claude Code everywhere?`
}

export function signOutWarning(sessionLive: boolean): string {
  return sessionLive
    ? t`This signs out the Claude Code CLI itself, so every terminal, editor and app using it on this computer is signed out too. The session running here stops.`
    : t`This signs out the Claude Code CLI itself, so every terminal, editor and app using it on this computer is signed out too.`
}

export function switchTitle(): string {
  return t`Switch the Claude Code login on this computer?`
}

export function switchWarning(sessionLive: boolean): string {
  return sessionLive
    ? t`This changes which account the Claude Code CLI uses everywhere on this computer. The session running here stops.`
    : t`This changes which account the Claude Code CLI uses everywhere on this computer.`
}

export function removeTitle(): string {
  return t`Remove this account from Zetrem?`
}

export function removeWarning(active: boolean): string {
  if (!active) return t`Zetrem forgets the saved credentials for this account.`
  return t`Zetrem forgets the saved credentials for this account. This computer stays signed in to it, but no account here is active until you add or switch.`
}

export function reauthTitle(): string {
  return t`Sign in again for this account?`
}

export function reauthWarning(sessionLive: boolean): string {
  return sessionLive
    ? t`This opens the browser to sign in again for this account. The session running here stops.`
    : t`This opens the browser to sign in again for this account.`
}
