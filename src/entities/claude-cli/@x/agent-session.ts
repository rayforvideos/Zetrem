// What agent-session may take from claude-cli, declared where it is given rather than where
// it is taken. FSD calls this a cross-import: the two slices sit on the same
// layer, so the dependency is written down instead of reached for.
export type {
  RateLimit,
  ResultMetrics,
  SessionIdentity,
  StatusEvent,
} from '../api/status/status.types'
export { absorbs, mergedLine } from '../lib/call-line/call-line'
