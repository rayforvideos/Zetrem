import type { Proposer } from './proposer.types'

// What a card or row says about who proposed it and where. Pure: it knows
// nothing of chats or sessions itself, only what the caller hands it — the
// session a proposal came from, its `by`, and a way to turn that session into
// a chat's title (or none, when the session is not one this screen remembers,
// as after a restart). The widget turns this into words; this only decides
// what there is to say.
export function proposerLine(
  proposal: { session: string; by: string },
  chatTitleOf: (session: string) => string | null,
): Proposer | null {
  const by = proposal.by.trim()
  const chatTitle = proposal.session.length > 0 ? chatTitleOf(proposal.session) : null
  if (by.length === 0 && chatTitle === null) return null
  return { by, chatTitle }
}
