// A folded row is one line tall, so a script has to stand on its first line.
// The ellipsis is what says the rest of it is still there, behind the row.
export function firstLineOf(command: string): string {
  const said = command.trim()
  const cut = said.indexOf('\n')
  return cut === -1 ? said : `${said.slice(0, cut).trimEnd()} …`
}

// What a row can hold before a command starts eating the answer under it.
const ROW_MAX = 120

// Opening a row is how the whole command is read. One the row already showed
// whole is not worth printing again above the output.
export function heldCommand(command: string): string | null {
  const said = command.trim()
  if (said.length === 0) return null
  return said.includes('\n') || said.length > ROW_MAX ? said : null
}
