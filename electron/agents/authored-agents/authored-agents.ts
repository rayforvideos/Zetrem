import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { nameInFrontmatter } from './frontmatter-name'

export function agentDirsFrom(project: string | null, home: string): string[] {
  const dirs: string[] = []
  let at = project
  while (at !== null && at.length > 0) {
    dirs.push(join(at, '.claude', 'agents'))
    const up = dirname(at)
    at = up === at ? null : up
  }
  const mine = join(home, '.claude', 'agents')
  if (!dirs.includes(mine)) dirs.push(mine)
  return dirs
}

async function namesIn(dir: string): Promise<string[]> {
  let files: string[]
  try {
    files = (await readdir(dir)).filter((one) => one.endsWith('.md'))
  } catch {
    return []
  }
  const found: string[] = []
  for (const file of files) {
    const said = await readFile(join(dir, file), 'utf8').catch(() => null)
    if (said === null) continue
    found.push(nameInFrontmatter(said) ?? file.slice(0, -'.md'.length))
  }
  return found
}

export async function authoredAgents(project: string | null, home: string): Promise<string[]> {
  const seen = new Set<string>()
  for (const dir of agentDirsFrom(project, home)) {
    for (const name of await namesIn(dir)) seen.add(name)
  }
  return [...seen]
}
