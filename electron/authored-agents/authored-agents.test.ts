import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { agentDirsFrom, authoredAgents } from './authored-agents'
import { nameInFrontmatter } from './frontmatter-name'

let root = ''

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'zt-agents-'))
})

async function put(dir: string, file: string, body: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, file), body, 'utf8')
}

describe('nameInFrontmatter: what the file calls itself', () => {
  it('takes the declared name over the file name', () => {
    expect(nameInFrontmatter('---\nname: Ray\ndescription: x\n---\n본문')).toBe('Ray')
  })

  it('strips quotes people write around it', () => {
    expect(nameInFrontmatter('---\nname: "Ray"\n---\n')).toBe('Ray')
  })

  it('says nothing when there is no frontmatter at all', () => {
    expect(nameInFrontmatter('그냥 본문')).toBe(null)
  })

  it('says nothing when the block never closes, rather than reading the whole file', () => {
    expect(nameInFrontmatter('---\nname: Ray\n본문이 이어진다')).toBe(null)
  })

  it('says nothing for an empty name', () => {
    expect(nameInFrontmatter('---\nname:   \n---\n')).toBe(null)
  })
})

describe('agentDirsFrom: every place Claude Code would look', () => {
  it('walks up from the project, since a parent folder can carry agents', () => {
    const dirs = agentDirsFrom('/a/b/c', '/home/ray')
    expect(dirs).toContain(join('/a/b/c', '.claude', 'agents'))
    expect(dirs).toContain(join('/a/b', '.claude', 'agents'))
    expect(dirs).toContain(join('/a', '.claude', 'agents'))
  })

  it('always includes the home folder', () => {
    expect(agentDirsFrom(null, '/home/ray')).toEqual([join('/home/ray', '.claude', 'agents')])
  })

  it('does not name the home folder twice when the project sits inside it', () => {
    const dirs = agentDirsFrom('/home/ray', '/home/ray')
    const mine = join('/home/ray', '.claude', 'agents')
    expect(dirs.filter((one) => one === mine)).toHaveLength(1)
  })

  it('stops at the root rather than looping forever', () => {
    expect(agentDirsFrom('/', '/home/ray').length).toBeLessThan(4)
  })
})

describe('authoredAgents: the ones the person wrote, not the ones Claude Code brings', () => {
  it('finds an agent a parent folder carries, which is how Ray turned up', async () => {
    await put(join(root, 'work', '.claude', 'agents'), 'ray.md', '---\nname: Ray\n---\n프론트엔드')
    const found = await authoredAgents(join(root, 'work', 'app'), join(root, 'home'))
    expect(found).toEqual(['Ray'])
  })

  it('falls back to the file name when the file declares none', async () => {
    await put(join(root, 'app', '.claude', 'agents'), 'scout.md', '조사한다')
    expect(await authoredAgents(join(root, 'app'), join(root, 'home'))).toEqual(['scout'])
  })

  it('reads the home folder too', async () => {
    await put(join(root, 'home', '.claude', 'agents'), 'mine.md', '---\nname: Mine\n---\n')
    expect(await authoredAgents(null, join(root, 'home'))).toEqual(['Mine'])
  })

  it('names one that sits in two places only once', async () => {
    await put(join(root, 'app', '.claude', 'agents'), 'ray.md', '---\nname: Ray\n---\n')
    await put(join(root, 'home', '.claude', 'agents'), 'ray.md', '---\nname: Ray\n---\n')
    expect(await authoredAgents(join(root, 'app'), join(root, 'home'))).toEqual(['Ray'])
  })

  it('ignores files that are not agent notes', async () => {
    await put(join(root, 'app', '.claude', 'agents'), 'README.txt', 'x')
    expect(await authoredAgents(join(root, 'app'), join(root, 'home'))).toEqual([])
  })

  it('finds nothing at all when no folder exists, rather than failing', async () => {
    expect(await authoredAgents(join(root, 'nowhere'), join(root, 'nohome'))).toEqual([])
  })
})
