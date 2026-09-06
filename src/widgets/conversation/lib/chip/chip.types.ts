export type Chip<Id extends string> = {
  // What the person chose, and what the menu checks.
  readonly pick: Id
  // What the running session is on instead, set only while the two differ.
  readonly inForce: Id | null
}
