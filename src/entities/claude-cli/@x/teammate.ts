// What teammate may take from claude-cli, declared where it is given rather than where
// it is taken. FSD calls this a cross-import: the two slices sit on the same
// layer, so the dependency is written down instead of reached for.
export { ORCHESTRATOR, agentsArgs } from '../api/roster-lock/roster-lock'
export { agentArgs } from '../api/run-config/run-config'
