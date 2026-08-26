// What teammate may take from agent-session, declared where it is given rather than where
// it is taken. FSD calls this a cross-import: the two slices sit on the same
// layer, so the dependency is written down instead of reached for.
export type { AgentSession } from '../model/session/session.types'
