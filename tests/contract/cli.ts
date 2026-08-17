import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const CONTRACT_TIMEOUT_MS = 180_000

const BASE = [
  '-p',
  '--output-format',
  'stream-json',
  '--verbose',
  '--max-turns',
  '1',
]

export type Init = {
  tools: string[]
  agents: string[]
  mcp: { name: string; status: string }[]
}

function initFrom(out: string): Init | null {
  for (const line of out.split('\n')) {
    if (line.length === 0) continue
    let event: Record<string, unknown>
    try {
      event = JSON.parse(line) as Record<string, unknown>
    } catch {
      continue
    }
    if (event.type !== 'system' || event.subtype !== 'init') continue
    const list = (key: string): string[] =>
      Array.isArray(event[key])
        ? (event[key] as unknown[]).filter((one): one is string => typeof one === 'string')
        : []
    return {
      tools: list('tools'),
      agents: list('agents'),
      mcp: Array.isArray(event.mcp_servers)
        ? (event.mcp_servers as { name: string; status: string }[])
        : [],
    }
  }
  return null
}

export async function askInit(args: string[] = [], prompt = 'hi'): Promise<Init> {
  const { stdout } = await execFileAsync('claude', [...BASE, prompt, ...args], {
    maxBuffer: 20_000_000,
    timeout: CONTRACT_TIMEOUT_MS,
  })
  const init = initFrom(stdout)
  if (init === null) throw new Error('the CLI sent no init event')
  return init
}

export async function askText(prompt: string, args: string[] = []): Promise<string> {
  const { stdout } = await execFileAsync(
    'claude',
    ['-p', prompt, '--max-turns', '1', ...args],
    { maxBuffer: 20_000_000, timeout: CONTRACT_TIMEOUT_MS },
  )
  return stdout.trim()
}

export const ORCHESTRATOR_ONLY = [
  '--agents',
  JSON.stringify({ zetrem: { description: 'o', prompt: 'You orchestrate.' } }),
  '--agent',
  'zetrem',
]
