import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Project } from '@/entities/project'
import { ProjectSheet } from './ProjectPicker'

const here: Project = { path: '/Users/sam/work/zetrem', name: 'zetrem' }

function sheet(recent: Project[] = []): string {
  return renderToStaticMarkup(
    <ProjectSheet project={here} recent={recent} onPick={() => {}} onChoose={() => {}} />,
  )
}

describe('the sheet behind the project name', () => {
  it('says where you are, with the home folder folded away', () => {
    const html = sheet()
    expect(html).toContain('zetrem')
    expect(html).toContain('~/work/zetrem')
  })

  it('offers the folders someone worked in lately', () => {
    const html = sheet([{ path: '/Users/sam/work/alpha', name: 'alpha' }])
    expect(html).toContain('alpha')
    expect(html).toContain('~/work/alpha')
  })

  it('spends no space on a list with nothing in it', () => {
    expect(sheet()).not.toContain('data-recent')
  })
})
