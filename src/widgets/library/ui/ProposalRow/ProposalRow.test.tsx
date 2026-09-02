import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LibraryProposal } from '@/entities/library'
import { ProposalRow } from './ProposalRow'

const proposal: LibraryProposal = {
  id: 'p1',
  folder: '',
  title: 'Auth choice',
  body: 'We went with sessions.',
  tags: ['auth'],
  proposedAtMs: 1_700_000_000_000,
  session: '',
  by: '',
}

function row(over: Partial<Parameters<typeof ProposalRow>[0]> = {}): string {
  return renderToStaticMarkup(
    <ul>
      <ProposalRow
        proposal={proposal}
        chatTitleOf={() => null}
        onAccept={() => {}}
        onDismiss={() => {}}
        {...over}
      />
    </ul>,
  )
}

describe('ProposalRow: what an agent would like to add, in the library pane', () => {
  it('says who proposed it and in which chat, when it knows both', () => {
    const out = row({
      proposal: { ...proposal, session: 'agent-1', by: 'React 개발자' },
      chatTitleOf: (session) => (session === 'agent-1' ? 'Auth rework' : null),
    })
    expect(out).toContain('data-proposer')
    expect(out).toContain('React 개발자')
    expect(out).toContain('Auth rework')
  })

  it('says only the name when the host is unknown, as after a restart', () => {
    const out = row({
      proposal: { ...proposal, session: 'agent-gone', by: 'React 개발자' },
      chatTitleOf: () => null,
    })
    expect(out).toContain('data-proposer')
    expect(out).toContain('React 개발자')
  })

  it('is silent about where it came from when there is nothing to say', () => {
    expect(row()).not.toContain('data-proposer')
  })
})
