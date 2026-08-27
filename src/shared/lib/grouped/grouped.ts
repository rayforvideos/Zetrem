import type { Group } from './grouped.types'

export function grouped<Key extends string, Item>(
  order: readonly Key[],
  items: readonly Item[],
  keyOf: (item: Item) => Key,
  plain: Key,
): Group<Key, Item>[] {
  const found = order
    .map((key) => ({ key, members: items.filter((item) => keyOf(item) === key) }))
    .filter((group) => group.members.length > 0)

  return found.map((group) => ({
    ...group,
    titled: found.length > 1 || group.key !== plain,
  }))
}
