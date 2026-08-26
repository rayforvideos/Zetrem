export function addressed(text: string, subagentType: string | null): string {
  const body = text.trim()
  if (subagentType === null || subagentType.length === 0) return body
  if (body.length === 0) return body
  return `Hand this to the ${subagentType} subagent (Agent tool, subagent_type: "${subagentType}").\n\n${body}`
}
