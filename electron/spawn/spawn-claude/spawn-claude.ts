import type { Launch } from './spawn-claude.types'

const WRAPPER = /\.(cmd|bat)$/i

// On Windows an npm install puts `claude.cmd` on the PATH, and since the fix for
// CVE-2024-27980 Node refuses to spawn a .cmd at all without a shell. Asking for
// a shell is not the way out: it strips the quotes out of an argument, and
// --agents carries JSON, which comes out the far side as rubbish. Handing the
// file to cmd.exe as an ordinary argument keeps it intact. All three were
// measured on a Windows runner; the results are in the commit that added this.
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
