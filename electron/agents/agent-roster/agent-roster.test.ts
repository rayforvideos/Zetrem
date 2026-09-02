import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AgentDefDraft } from '@/entities/agent-def'
import { listAgentDefs, writeAgentDef } from '../agent-store/agent-store'
import { readRoster, removeFromRoster, replaceInRoster, writeToRoster } from './agent-roster'
import type { RosterDirs } from './agent-roster.types'

async function dirs(withProject = true): Promise<RosterDirs> {
  const root = await mkdtemp(join(tmpdir(), 'zetrem-roster-'))
  return { user: join(root, 'agents'), project: withProject ? join(root, 'here') : null }
}

const draft: AgentDefDraft = {
  name: 'code reviewer',
  description: 'reads what changed',
  model: 'sonnet',
  character: null,
  tools: ['Read'],
  knowledge: [],
  prompt: 'look closely',
  source: 'user',
}

const mine: AgentDefDraft = { ...draft, source: 'project' }

describe('readRoster: one team, wherever each person is kept', () => {
  it('holds up when neither folder has ever been written', async () => {
    expect(await readRoster(await dirs())).toEqual([])
  })

  it('shows the shared people alone when no project is open', async () => {
    const where = await dirs(false)
    await writeToRoster(where, draft)
    expect((await readRoster(where)).map((def) => def.name)).toEqual(['code reviewer'])
  })

  it('puts both scopes on one list, sorted by name', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'zeta' })
    await writeToRoster(where, { ...mine, name: 'alpha' })
    await writeToRoster(where, { ...draft, name: 'middle' })
    expect((await readRoster(where)).map((def) => def.name)).toEqual(['alpha', 'middle', 'zeta'])
  })

  it('says where each person came from, so the row can show it', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'shared one' })
    await writeToRoster(where, { ...mine, name: 'local one' })
    const roster = await readRoster(where)
    expect(roster.map((def) => [def.name, def.source])).toEqual([
      ['local one', 'project'],
      ['shared one', 'user'],
    ])
  })

  // The app refuses to make this pair, but a folder written by an older
  // version, or by hand, can already hold one.
  it("lets this project's version stand in for a shared one of the same name", async () => {
    const where = await dirs()
    await writeAgentDef(where.user, { ...draft, description: 'the shared brief' })
    await writeAgentDef(where.project ?? '', { ...mine, description: 'the brief for here' })
    const roster = await readRoster(where)
    expect(roster).toHaveLength(1)
    expect(roster[0]).toMatchObject({ description: 'the brief for here', source: 'project' })
  })

  it('shadows a name however it was capitalised, since one name is one person', async () => {
    const where = await dirs()
    await writeAgentDef(where.user, { ...draft, name: 'Code Reviewer' })
    await writeAgentDef(where.project ?? '', mine)
    expect((await readRoster(where)).map((def) => def.source)).toEqual(['project'])
  })

  it('goes back to the shared list once the project is closed', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'shared one' })
    await writeToRoster(where, { ...mine, name: 'local one' })
    expect((await readRoster({ ...where, project: null })).map((def) => def.name)).toEqual([
      'shared one',
    ])
  })
})

describe('writeToRoster: the scope picks the folder', () => {
  it('keeps a shared teammate out of the project folder', async () => {
    const where = await dirs()
    await writeToRoster(where, draft)
    expect(await listAgentDefs(where.user)).toHaveLength(1)
    expect(await listAgentDefs(where.project ?? '')).toHaveLength(0)
  })

  it('keeps a project teammate out of the shared folder', async () => {
    const where = await dirs()
    await writeToRoster(where, mine)
    expect(await listAgentDefs(where.user)).toHaveLength(0)
    expect(await listAgentDefs(where.project ?? '')).toHaveLength(1)
  })

  it('has nowhere to put a project teammate with no project open', async () => {
    const answer = await writeToRoster(await dirs(false), mine)
    expect(answer).toEqual({ ok: false, why: { code: 'unsupported', said: 'code reviewer' } })
  })

  it('refuses a name the other scope already uses, rather than hiding one of them', async () => {
    const where = await dirs()
    await writeToRoster(where, draft)
    const answer = await writeToRoster(where, mine)
    expect(answer).toEqual({ ok: false, why: { code: 'refused', said: 'code reviewer' } })
    expect(await listAgentDefs(where.project ?? '')).toHaveLength(0)
  })

  it('refuses the same name back the other way too', async () => {
    const where = await dirs()
    await writeToRoster(where, mine)
    expect(await writeToRoster(where, draft)).toMatchObject({ ok: false })
  })

  it('answers with the file it wrote when it went through', async () => {
    const where = await dirs()
    const answer = await writeToRoster(where, mine)
    expect(answer.ok && answer.value).toBe(join(where.project ?? '', 'code-reviewer.md'))
  })
})

describe('removeFromRoster: let someone go from the scope they are in', () => {
  it('takes the project one and leaves the shared one alone', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'shared one' })
    await writeToRoster(where, { ...mine, name: 'local one' })

    await removeFromRoster(where, 'local one', 'project')

    expect((await readRoster(where)).map((def) => def.name)).toEqual(['shared one'])
  })

  it('takes the shared one and leaves the project one alone', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'shared one' })
    await writeToRoster(where, { ...mine, name: 'local one' })

    await removeFromRoster(where, 'shared one', 'user')

    expect((await readRoster(where)).map((def) => def.name)).toEqual(['local one'])
  })

  it('does nothing about a project person when no project is open', async () => {
    await expect(removeFromRoster(await dirs(false), 'anyone', 'project')).resolves.toEqual({
      ok: true,
      value: undefined,
    })
  })
})

describe('replaceInRoster: editing, including a change of scope', () => {
  it('edits in place while the scope stays the same', async () => {
    const where = await dirs()
    await writeToRoster(where, mine)

    await replaceInRoster(where, { ...mine, description: 'a newer brief' }, mine.name, 'project')

    const roster = await readRoster(where)
    expect(roster).toHaveLength(1)
    expect(roster[0]).toMatchObject({ description: 'a newer brief', source: 'project' })
  })

  it('moves someone into this project and leaves nothing behind', async () => {
    const where = await dirs()
    await writeToRoster(where, draft)

    const answer = await replaceInRoster(where, mine, draft.name, 'user')

    expect(answer.ok).toBe(true)
    expect(await listAgentDefs(where.user)).toHaveLength(0)
    expect((await readRoster(where)).map((def) => def.source)).toEqual(['project'])
  })

  it('moves someone back out to every project and leaves nothing behind', async () => {
    const where = await dirs()
    await writeToRoster(where, mine)

    await replaceInRoster(where, draft, mine.name, 'project')

    expect(await listAgentDefs(where.project ?? '')).toHaveLength(0)
    expect((await readRoster(where)).map((def) => def.source)).toEqual(['user'])
  })

  it('renames and changes scope in one go', async () => {
    const where = await dirs()
    await writeToRoster(where, draft)

    await replaceInRoster(where, { ...mine, name: 'reviewer' }, draft.name, 'user')

    expect((await readRoster(where)).map((def) => [def.name, def.source])).toEqual([
      ['reviewer', 'project'],
    ])
  })

  it('does not call the person being moved a name that is taken', async () => {
    const where = await dirs()
    await writeToRoster(where, draft)
    expect(await replaceInRoster(where, mine, draft.name, 'user')).toMatchObject({ ok: true })
  })

  it('still refuses a rename onto a name the other scope holds', async () => {
    const where = await dirs()
    await writeToRoster(where, { ...draft, name: 'taken' })
    await writeToRoster(where, { ...mine, name: 'local one' })

    const answer = await replaceInRoster(where, { ...mine, name: 'taken' }, 'local one', 'project')

    expect(answer).toEqual({ ok: false, why: { code: 'refused', said: 'taken' } })
    expect((await readRoster(where)).map((def) => def.name)).toEqual(['local one', 'taken'])
  })

  it('has nowhere to move someone to when no project is open', async () => {
    const where = await dirs(false)
    await writeToRoster(where, draft)
    expect(await replaceInRoster(where, mine, draft.name, 'user')).toMatchObject({ ok: false })
    expect(await listAgentDefs(where.user)).toHaveLength(1)
  })

  // A folder written by an older version, or by hand, can already hold a
  // shared and a project person of the same name; only the project one shows.
  // Editing that one in place is not a new clash, even though the other scope
  // still has the name.
  it('editing someone already shadowed is not a new clash', async () => {
    const where = await dirs()
    await writeAgentDef(where.user, { ...draft, description: 'the shared brief' })
    await writeAgentDef(where.project ?? '', { ...mine, description: 'the brief for here' })

    const answer = await replaceInRoster(
      where,
      { ...mine, description: 'a newer brief for here' },
      mine.name,
      'project',
    )

    expect(answer).toMatchObject({ ok: true })
    const roster = await readRoster(where)
    expect(roster).toHaveLength(1)
    expect(roster[0]).toMatchObject({ description: 'a newer brief for here', source: 'project' })
    const shared = await listAgentDefs(where.user)
    expect(shared).toHaveLength(1)
    expect(shared[0]).toMatchObject({ description: 'the shared brief' })
  })
})
