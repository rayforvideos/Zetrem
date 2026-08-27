import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Project } from '@/entities/project'
import { ProjectSwitcher, baseName, tilde } from './ProjectSwitcher'

const here: Project = { id: 'p1', path: '/Users/sam/work/zetrem', name: '출고 자동화' }
const elsewhere: Project = { id: 'p3', path: '/Users/sam/work/blog', name: 'blog' }

function bar(current: Project | null = here, all: Project[] = [here, elsewhere]): string {
  return renderToStaticMarkup(
    <ProjectSwitcher
      projects={{
        current,
        all,
        onOpen: () => {},
        onPickFolder: () => {},
        onForget: () => {},
      }}
    />,
  )
}

describe('the directory row, one quiet level above the filing', () => {
  it('names the folder and folds the home away into the tooltip', () => {
    const html = bar()
    expect(html).toContain('zetrem')
    expect(html).toContain('~/work/zetrem')
  })

  it('keeps the other directories behind a press', () => {
    const html = bar()
    expect(html, 'another directory stays shut').not.toContain('blog')
    expect(html).toContain('data-state="closed"')
  })

  it('asks to choose a project while none is open', () => {
    expect(bar(null, [])).toContain('Choose project')
  })

  it('carries a menu for the project on the row itself', () => {
    expect(bar()).toContain('More for 출고 자동화')
  })

  it('offers no filing of its own', () => {
    const html = bar()
    expect(html).not.toContain('New category')
    expect(html).not.toContain('Category name')
  })
})

describe('the little path helpers', () => {
  it('folds the home folder to a tilde', () => {
    expect(tilde('/Users/sam/work/zetrem')).toBe('~/work/zetrem')
  })

  it('names a path by its last step', () => {
    expect(baseName('/Users/sam/work/zetrem')).toBe('zetrem')
  })
})
