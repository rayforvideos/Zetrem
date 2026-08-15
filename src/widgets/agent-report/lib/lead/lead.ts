import type { TranscriptEntry } from '@/entities/agent-session'

export function leadOf(headline: string, transcript: TranscriptEntry[]): string | null {
  const said = headline.replace(/…$/, '').trim()
  if (said.length === 0) return null
  const spoken = transcript.filter((entry) => entry.role === 'assistant').map((entry) => entry.text)
  if (spoken.some((text) => text.startsWith(said) || said.startsWith(text))) return null
  return headline
}
