// What settings may take from claude-cli, declared where it is given rather than where
// it is taken. FSD calls this a cross-import: the two slices sit on the same
// layer, so the dependency is written down instead of reached for.
export type { ModelChoice } from '../model/model-choice/model-choice.types'
export type { PermissionMode } from '../api/run-config/run-config.types'
