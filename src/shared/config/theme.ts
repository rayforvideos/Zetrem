export const GROUND = { dark: '#000000', light: '#ffffff' } as const

export const CONTROL_SYMBOL = { dark: '#ededf0', light: '#1a1a1a' } as const

export const TRAFFIC_LIGHT = { x: 18, y: 18, size: 14 } as const

export const CHROME_TOP = TRAFFIC_LIGHT.y * 2 + TRAFFIC_LIGHT.size + 8

export const SHELL_PAD = 28

export const GRID_PAD = 20

export const WINDOWS_CONTROLS_WIDTH = 138

export const MIN_WINDOW = { width: 720, height: 520 } as const

export const USAGE_BAR = { height: 30 } as const

export const SIDEBAR = { width: 232, min: 176, max: 420, step: 16, gap: 28, gutter: 16 } as const

// The git history's draggable columns: the width each one opens at, and the floor
// and ceiling a saved or dragged width is pulled into. The floors are what the cell
// still reads as: a ref pill, a file count, a short sha, a clock time. The graph
// column is absent because the lane count sizes it, not a person.
export const GIT_COLUMNS = {
  refs: { width: 112, min: 48, max: 480 },
  changes: { width: 128, min: 56, max: 320 },
  author: { width: 96, min: 48, max: 320 },
  sha: { width: 56, min: 44, max: 160 },
  when: { width: 48, min: 40, max: 160 },
} as const

// One arrow key press. Half the sidebar's notch, because these columns are a
// quarter of its width and a 16px jump skips past what was being aimed at.
export const GIT_COLUMN_STEP = 8

// The frame a history row is drawn inside: the padding at each end, the seam
// between two cells, the floor the commit message keeps for itself, and the
// gutter the list's scrollbar stands in. The resizable columns share whatever is
// left of the table after all of that, which is what keeps a widened column from
// pushing the ones on its right off the edge.
export const GIT_TABLE = { pad: 16, gap: 12, message: 64, gutter: 8 } as const

// The order the columns step aside in, once the table is too narrow to draw even
// their floors. The author goes first and the change bars next, because those are
// the two a commit still reads without. The graph and the message never leave.
export const GIT_COLUMN_GIVEWAY = ['author', 'changes', 'refs', 'when', 'sha'] as const
