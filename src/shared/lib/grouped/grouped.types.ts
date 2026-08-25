export type Group<Key extends string, Item> = {
  readonly key: Key
  readonly members: Item[]
  readonly titled: boolean
}
