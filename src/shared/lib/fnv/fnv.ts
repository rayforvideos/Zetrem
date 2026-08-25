// FNV-1a, 32-bit. What it is used for is picking the same face or colour for a
// name every time, so it only has to be stable and cheap, never secure. Anything
// that changes it changes which face an existing teammate already wears.
export function fnv1a(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}
