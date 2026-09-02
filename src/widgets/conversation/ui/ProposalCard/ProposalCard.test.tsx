import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LibraryProposal } from '@/entities/library'
import { ProposalCard } from './ProposalCard'

const proposal: LibraryProposal = {
  id: 'p1',
  folder: '',
  title: 'Auth choice',
  body: '# Auth choice\n\nWe went with **sessions**.\n\nThe rest of the reasoning.',
  tags: ['auth', 'decision'],
  proposedAtMs: 1_700_000_000_000,
}

function card(over: Partial<Parameters<typeof ProposalCard>[0]> = {}): string {
  return renderToStaticMarkup(
    <ProposalCard
      proposal={proposal}
      waiting={1}
      onAccept={() => {}}
      onDismiss={() => {}}
      {...over}
    />,
  )
}

describe('ProposalCard: what an agent would like to add', () => {
  it('says the library is being suggested to, and names the note', () => {
    const out = card()
    expect(out).toContain('data-proposal="p1"')
    expect(out).toContain('Suggested for the library')
    expect(out).toContain('Auth choice')
  })

  it('shows the first paragraph as markdown, not the whole body', () => {
    const out = card()
    expect(out).toContain('<strong')
    expect(out).toContain('sessions')
    expect(out).not.toContain('The rest of the reasoning')
  })

  it('lists the tags it came with', () => {
    const out = card()
    expect(out).toContain('data-tag="auth"')
    expect(out).toContain('data-tag="decision"')
  })

  it('names the folder it asks for, and nothing when it asks for none', () => {
    expect(card({ proposal: { ...proposal, folder: 'plans' } })).toContain(
      'data-proposal-folder="plans"',
    )
    expect(card()).not.toContain('data-proposal-folder')
  })

  it('offers both answers and nothing else', () => {
    const out = card()
    expect(out).toContain('Accept')
    expect(out).toContain('Dismiss')
  })

  it('counts the ones still behind it, and stays quiet when it is the only one', () => {
    expect(card({ waiting: 3 })).toContain('2 more waiting')
    expect(card()).not.toContain('more waiting')
  })
})
