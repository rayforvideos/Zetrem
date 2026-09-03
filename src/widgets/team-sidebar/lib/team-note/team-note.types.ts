export type TeamNote =
  // 'taken' is a name the other scope already uses: keeping both would leave
  // one of the two invisible.
  | { kind: 'created' | 'updated' | 'released' | 'taken'; name: string }
  | { kind: 'trouble'; text: string }

export type NoteLine = {
  text: string
  restart: boolean
}
