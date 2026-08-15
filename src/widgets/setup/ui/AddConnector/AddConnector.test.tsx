import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AddConnector } from './AddConnector'

function panel(taken: string[] = [], busy = false): string {
  return renderToStaticMarkup(
    <AddConnector taken={taken} busy={busy} onAdd={async () => true} onImport={() => {}} />,
  )
}

describe('AddConnector: the two ways to wire one up', () => {
  it('leads with bringing over what Claude Desktop has, which needs no typing', () => {
    expect(panel()).toContain('Import from Claude Desktop')
  })

  it('keeps the by hand way folded away, since almost nobody types a server address', () => {
    const html = panel()
    expect(html).toContain('Add one by address')
    expect(html).not.toContain('data-add-form')
    expect(html).not.toContain('Connector address')
  })

  it('says the fold is shut, so it can be found by anyone not using a pointer', () => {
    expect(panel()).toContain('aria-expanded="false"')
  })

  it('stops both ways while a connector is being added, so nothing goes twice', () => {
    expect(panel([], true)).toContain('disabled=""')
  })
})
