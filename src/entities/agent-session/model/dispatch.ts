export function addressed(text: string, subagentType: string | null): string {
  const body = text.trim()
  if (subagentType === null || subagentType.length === 0) return body
  if (body.length === 0) return body
  return `${subagentType} 서브에이전트에게 맡겨 주세요 (Agent 도구의 subagent_type 을 "${subagentType}" 로).\n\n${body}`
}
