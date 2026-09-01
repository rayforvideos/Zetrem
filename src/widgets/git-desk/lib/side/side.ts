import type { GitFile } from '@/entities/git/model/repo'
import type { DiffSide } from './side.types'

// While anything is still unstaged that side is what the person is deciding
// about; only a fully staged file shows what the commit would take.
export function sideOf(file: GitFile): DiffSide {
  if (file.sign === '?') return 'untracked'
  return file.unstaged ? 'unstaged' : 'staged'
}
