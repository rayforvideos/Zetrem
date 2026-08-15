const BLANK = 'no output'

export function noteParts(
  note: string | null,
  failed: boolean,
): { note: string | null; failure: string | null } {
  if (!failed) return { note, failure: null }
  const said = note === null || note === BLANK ? null : note.trim()
  return { note: null, failure: said !== null && said.length > 0 ? said : 'failed' }
}
