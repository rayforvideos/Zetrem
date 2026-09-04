import { renderToStaticMarkup } from 'react-dom/server'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { describe, expect, it } from 'vitest'
import { EnvField } from './EnvField'

function field(names: string[]): string {
  return renderToStaticMarkup(
    <I18nProvider i18n={i18n}>
      <EnvField names={names} onChange={() => {}} />
    </I18nProvider>,
  )
}

describe('EnvField: naming what a session may read from the shell', () => {
  it('shows every name that was named, and a way to take each one off', () => {
    const html = field(['GITHUB_TOKEN', 'FIGMA_PAT'])
    expect(html).toContain('GITHUB_TOKEN')
    expect(html).toContain('FIGMA_PAT')
    expect(html).toContain('aria-label="Remove GITHUB_TOKEN"')
    expect(html).toContain('aria-label="Remove FIGMA_PAT"')
  })

  it('draws no list at all when nothing has been named', () => {
    expect(field([])).not.toContain('data-env-list')
  })

  it('cannot add until something addable is typed, so nothing empty gets saved', () => {
    const add = field([]).match(/<button[^>]*aria-label="Add variable"[^>]*>/)?.[0] ?? ''
    expect(add, 'the button was not rendered at all').not.toBe('')
    expect(add).toContain('disabled=""')
  })

  it('says the values stay in the shell, because that is the whole bargain', () => {
    expect(field([])).toContain('never the values')
  })
})
