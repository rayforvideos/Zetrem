export const ORCHESTRATOR = 'zetrem'

export type Person = {
  name: string
  description: string
  prompt: string
  model: string | null
}

export type RosterLock = {
  knownTools: string[]
}

type Spec = Record<string, { description: string; prompt: string; model?: string; tools?: string[] }>

// 사람들은 앱의 폴더에 살고 세션마다 --agents 로 실려 간다 — 어느 프로젝트에서 열어도 같은 명단이다.
// prompt 가 빈 항목은 CLI 가 통째로 무시하므로(실측) 지시가 없는 사람은 싣지 않는다.
export function peopleSpec(people: Person[]): Spec {
  const spec: Spec = {}
  for (const person of people) {
    if (person.name.length === 0 || person.prompt.trim().length === 0) continue
    spec[person.name] = {
      description: person.description.length > 0 ? person.description : person.name,
      prompt: person.prompt,
      ...(person.model === null ? {} : { model: person.model }),
    }
  }
  return spec
}

// 잠금은 세션 주 에이전트의 tools 로만 표현된다. tools 에 "*" 를 섞으면 제한이 풀리고
// mcp__* 같은 접두 와일드카드는 버려지므로(실측) 도구 이름을 하나씩 적는다.
export function agentsArgs(
  people: Person[],
  lock: RosterLock | null,
  orchestratorPrompt: string,
): string[] {
  const spec = peopleSpec(people)
  const names = Object.keys(spec)
  const locking = lock !== null && names.length > 0 && lock.knownTools.length > 0

  if (locking) {
    const tools = lock.knownTools.filter((name) => name !== 'Task' && !name.startsWith('Agent('))
    spec[ORCHESTRATOR] = {
      description: 'Zetrem 이 세우는 오케스트레이터',
      prompt: orchestratorPrompt,
      tools: [...tools, `Agent(${names.join(', ')})`],
    }
  }

  if (Object.keys(spec).length === 0) return []
  const args = ['--agents', JSON.stringify(spec)]
  return locking ? [...args, '--agent', ORCHESTRATOR] : args
}
