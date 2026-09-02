// A dismiss hides a proposal at once but waits before it asks main to delete
// it. Each id maps to the token of the hide that currently owns its delete.
export type PendingDismiss = Map<string, number>
