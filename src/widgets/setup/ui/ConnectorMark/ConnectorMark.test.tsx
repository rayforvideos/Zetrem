import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConnectorMark } from './ConnectorMark'

function mark(where: string): string {
  return renderToStaticMarkup(<ConnectorMark where={where} />)
}

describe('ConnectorMark: the badge at the head of a connector row', () => {
  it('wears the service its own logo, in its own colours', () => {
    const html = mark('https://mcp.figma.com/mcp')
    expect(html).toContain('data-logo="colour"')
    expect(html).toContain('data:image/svg+xml')
  })

  it('seats a colour logo on white, the way those logos are drawn to be seen', () => {
    expect(mark('https://gmailmcp.googleapis.com/mcp/v1')).toContain('bg-white')
  })

  it('falls back to the plain mark for a service with no logo on file', () => {
    const html = mark('https://mcp.airtable.com/mcp')
    expect(html).not.toContain('data-logo')
    expect(html).toContain('data-connector-mark="airtable"')
  })

  it('keeps the same space for a service it does not know, so the rows line up', () => {
    const html = mark('https://mcp.example.com/mcp')
    expect(html).toContain('data-connector-mark="unknown"')
    expect(html).toContain('size-7')
  })

  it('shows a plain mark rather than nothing, since a gap would read as broken', () => {
    expect(mark('npx @playwright/mcp@latest')).toContain('lucide-plug')
  })

  it('leaves the badge out of the reading order, since the name is written beside it', () => {
    expect(mark('https://mcp.figma.com/mcp')).toContain('alt=""')
  })
})
