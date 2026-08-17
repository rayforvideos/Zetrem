export function startBlocker(signedIn: boolean, hasProject: boolean): string | null {
  if (signedIn && hasProject) return null
  if (!signedIn && !hasProject) return 'Sign in and choose a project folder'
  return signedIn ? 'Choose a project folder' : 'Sign in to your Anthropic account'
}
