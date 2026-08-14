/**
 * 파서 넷이 함께 쓰는 조각. 대화·자식·권한이 같은 방식으로 도구 한 줄을 만들어야
 * 화면의 눈금이 한 문법으로 읽힌다.
 */

/** 2층 한 줄의 상한. 읽는 층이 아니라 흐르는 층이다 (스펙 §5.2) */
export const STREAM_LINE_MAX = 120

/** 도구 입력에서 사람이 알아볼 대상 하나를 고른다 — 흔한 키 순서대로 */
const TARGET_KEYS = ['file_path', 'command', 'pattern', 'path', 'url', 'query'] as const

export function toolLine(name: string, input: unknown): string {
  let target = ''
  if (typeof input === 'object' && input !== null) {
    for (const key of TARGET_KEYS) {
      const value = (input as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.length > 0) {
        target = value
        break
      }
    }
  }
  return `${name} ${target}`.trim().slice(0, STREAM_LINE_MAX)
}

/** tool_result 의 content 는 문자열이거나 text 블록 배열이다 — 둘 다에서 사람 말을 꺼낸다 */
export function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as Record<string, unknown>[])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join(' ')
  }
  return ''
}
