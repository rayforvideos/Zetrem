// The shape of an environment variable name, as POSIX describes it and as every
// shell writes it. Zetrem stores names people want carried into a session, never
// their values: a token typed into a settings screen would sit in settings.json
// in plain text, readable by anything that can read the person's home folder,
// and would go on living there after the token was rotated. The name is a
// pointer into the shell environment the app was started from, so the secret
// stays wherever the person already keeps it.
const ENV_NAME = /^[A-Z][A-Z0-9_]*$/

export function isEnvName(value: unknown): value is string {
  return typeof value === 'string' && ENV_NAME.test(value)
}
