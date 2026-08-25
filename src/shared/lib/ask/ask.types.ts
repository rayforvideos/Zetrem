export type Asking = {
  readonly busy: string | null
  readonly note: string | null
  say(line: string | null): void
  clear(): void
  ask<T>(key: string, what: string, task: () => Promise<T>): Promise<T | null>
}
