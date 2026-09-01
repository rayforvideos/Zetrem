// Which side of a change a diff should show: what is staged, what is not
// yet, or a file git does not know at all.
export type DiffSide = 'staged' | 'unstaged' | 'untracked'
