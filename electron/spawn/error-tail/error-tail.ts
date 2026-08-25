export const ERROR_TAIL_MAX = 2000

// stderr arrives in pieces and the last piece is often harmless noise, so the
// tail has to be kept across chunks. Only the end is worth holding: the line
// that names the trouble is the last one written.
export function errorTail(held: string, chunk: string, max: number = ERROR_TAIL_MAX): string {
  return (held + chunk).slice(-max)
}
