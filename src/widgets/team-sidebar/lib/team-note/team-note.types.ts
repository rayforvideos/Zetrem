export type TeamNote =
  | { kind: 'created' | 'updated' | 'released'; name: string }
  | { kind: 'trouble'; text: string }

export type NoteLine = {
  text: string
  restart: boolean
}
