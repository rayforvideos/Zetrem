// What agent-session may take from conversation, declared where it is given rather than where
// it is taken. FSD calls this a cross-import: the two slices sit on the same
// layer, so the dependency is written down instead of reached for.
export type { ChatSpend } from '../model/transcript/transcript.types'
