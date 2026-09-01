type HunkLineKind = 'plain' | 'added' | 'removed'

// One code line of a hunk: the side a number is missing on did not have it.
export type HunkLine = {
  kind: HunkLineKind
  oldNo: number | null
  newNo: number | null
  text: string
}

export type Hunk = { header: string; lines: HunkLine[] }
