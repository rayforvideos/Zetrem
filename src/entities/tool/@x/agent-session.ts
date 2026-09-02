// What a stored call carries about the edit it made. The session holds the
// diff itself, cut once when the call arrived, so nothing downstream has to
// keep the raw tool input around or run the differ again on every render.
export type { DiffLine } from '../lib/diff/diff.types'
export type { ChangeCount } from '../lib/change-count/change-count.types'
