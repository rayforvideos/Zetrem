export const SIGN_OUT_TITLE = 'Sign out of Claude Code everywhere?'

export function signOutWarning(sessionLive: boolean): string {
  const shared =
    'This signs out the Claude Code CLI itself, so every terminal, editor and app using it on this computer is signed out too.'
  return sessionLive ? `${shared} The session running here stops.` : shared
}

export function signOutHint(sessionLive: boolean): string {
  return sessionLive
    ? 'Signing out stops the running session, and every other Claude Code on this computer.'
    : 'Signs out every Claude Code on this computer, not just Zetrem.'
}
