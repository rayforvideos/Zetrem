export const ERROR_TAIL_MAX = 2000

export function errorTail(held: string, chunk: string, max: number = ERROR_TAIL_MAX): string {
  return (held + chunk).slice(-max)
}
