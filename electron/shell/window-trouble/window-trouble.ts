const ABORTED = -3

export function loadTroubleLine(errorCode: number, errorDescription: string): string | null {
  if (errorCode === ABORTED) return null
  const said = errorDescription.trim()
  return said.length > 0 ? `The window could not load: ${said}` : 'The window could not load'
}

export function troublePage(line: string): string {
  const body = escaped(line)
  return `data:text/html;charset=utf-8,${encodeURIComponent(
    `<body style="margin:0;padding:56px;background:#000;color:#ededf0;font:12.5px/1.7 ui-monospace,monospace"><p style="font-size:15px">Zetrem could not open its window.</p><pre style="white-space:pre-wrap;opacity:.6">${body}</pre></body>`,
  )}`
}

function escaped(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
