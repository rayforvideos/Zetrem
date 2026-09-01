import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { MemoryNote } from '@/entities/agent-memory/model/note'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { claudeBin, loginPath } from '../../../cli/login-path/login-path'
import { agentEnv } from '../../../spawn/shell-env/shell-env'
import { launchFor } from '../../../spawn/spawn-claude/spawn-claude'
import type { RunPrompt, Translated } from './memory-translate.types'

const execFileAsync = promisify(execFile)

const TRANSLATE_TIMEOUT_MS = 90_000
const MODEL = 'claude-haiku-4-5-20251001'


const TONGUES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
}

export function promptFor(note: MemoryNote, tongue: string): string {
  const language = TONGUES[tongue] ?? tongue
  return [
    `Translate the description and body below into ${language}.`,
    'Keep the markdown structure and leave code, paths, and commands as they are.',
    'Answer with ONLY a JSON object of the shape {"description": string, "body": string} and nothing else.',
    '',
    `description: ${JSON.stringify(note.description)}`,
    'body:',
    note.body,
  ].join('\n')
}

// The model is told to answer bare JSON, but a fence around it is close
// enough to still take.
export function translationOf(answer: string): Translated | null {
  const bare = answer
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
  try {
    const parsed: unknown = JSON.parse(bare)
    if (typeof parsed !== 'object' || parsed === null) return null
    const found = parsed as Record<string, unknown>
    if (typeof found.description !== 'string' || typeof found.body !== 'string') return null
    return { description: found.description, body: found.body }
  } catch {
    return null
  }
}

export async function runTranslatePrompt(prompt: string): Promise<string> {
  const launch = launchFor(await claudeBin(), ['-p', prompt, '--model', MODEL])
  const { stdout } = await execFileAsync(launch.command, launch.args, {
    // A translation needs no pondering: with thinking on, Haiku spent three
    // times the answer's tokens before it, tripling the wait (measured).
    env: { ...agentEnv(process.env, await loginPath()), MAX_THINKING_TOKENS: '0' },
    timeout: TRANSLATE_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  })
  return stdout
}

export async function translateNote(
  note: MemoryNote,
  tongue: string,
  run: RunPrompt,
): Promise<Outcome<Translated>> {
  const answer = await run(promptFor(note, tongue)).catch(() => null)
  if (answer === null) return lost('cli', 'translate')
  const found = translationOf(answer)
  return found === null ? lost('garbled', answer.slice(0, 200)) : won(found)
}
