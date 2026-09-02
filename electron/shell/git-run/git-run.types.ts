// What one git invocation said. A git that could not run at all is a failure
// with a code of its own, never a throw: the caller answers with an Outcome.
export type GitReply = { code: number; stdout: string; stderr: string }
