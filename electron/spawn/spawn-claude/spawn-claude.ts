import type { Launch } from './spawn-claude.types'

const WRAPPER = /\.(cmd|bat)$/i

// Since the fix for CVE-2024-27980 Node refuses to spawn a .cmd without a shell,
// and a shell strips the quotes out of the JSON --agents carries. Handing the
// file to cmd.exe as an ordinary argument keeps it intact.
export function launchFor(
  command: string,
  args: string[],
  platform: string = process.platform,
  comspec: string | undefined = process.env.COMSPEC,
): Launch {
  if (platform !== 'win32' || !WRAPPER.test(command)) return { command, args }
  const shell = comspec === undefined || comspec.length === 0 ? 'cmd.exe' : comspec
  return { command: shell, args: ['/d', '/s', '/c', command, ...args] }
}
