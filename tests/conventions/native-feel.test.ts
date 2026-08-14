import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

async function css(): Promise<string> {
  return readFile(join('src', 'app', 'styles', 'global.css'), 'utf8')
}

describe('네이티브 앱처럼 군다', () => {
  it('누를 수 있는 것에는 손가락 커서가 선다 — Tailwind v4 는 이것을 주지 않는다', async () => {
    const text = await css()
    const rule = text.slice(text.indexOf('button,'), text.indexOf('cursor: pointer'))
    expect(rule, '버튼과 메뉴·스위치·탭이 한 규칙에 묶여야 한다').toContain("[role='switch']")
    expect(text).toContain('cursor: pointer')
  })

  it('막힌 것은 손가락을 내린다 — 눌리지 않는데 눌릴 것처럼 보이면 거짓말이다', async () => {
    expect(await css()).toMatch(/button:disabled[^}]*cursor: default/s)
  })

  it('판때기는 끌리지 않는다 — 글자는 읽을 자리에서만 잡힌다', async () => {
    const text = await css()
    expect(text).toMatch(/body\s*\{[^}]*user-select: none/s)
    expect(text).toMatch(/\[data-selectable\][^{]*\{[^}]*user-select: text/s)
  })

  it('고무줄 스크롤로 창 밖이 드러나지 않는다', async () => {
    expect(await css()).toContain('overscroll-behavior: none')
  })

  it('그림과 워드마크를 창 밖으로 끌어낼 수 없다', async () => {
    expect(await css()).toContain('-webkit-user-drag: none')
  })
})

describe('읽을 것은 잡히고 나머지는 잡히지 않는다', () => {
  it('대화·보고서·세션 명세에만 data-selectable 이 붙는다', async () => {
    const marked: string[] = []
    async function walk(dir: string): Promise<void> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) await walk(full)
        else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
          if ((await readFile(full, 'utf8')).includes('data-selectable')) marked.push(entry.name)
        }
      }
    }
    await walk(join('src', 'widgets'))
    expect(marked.sort()).toEqual([
      'AgentReport.tsx',
      'Approval.tsx',
      'ConversationPane.tsx',
      'SetupPane.tsx',
      'StatusDrawer.tsx',
      'ToolDetail.tsx',
    ])
  })
})
