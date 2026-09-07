// How many lines of an element's content sit below the box that holds it.
// A card that caps its body has to say how much it cut, and the only honest
// source is the box itself: the text is already wrapped by the time it is
// measured, so counting newlines in the string would undercount every wrap.
export function hiddenLines(
  scrollHeight: number,
  clientHeight: number,
  lineHeight: number,
): number {
  if (lineHeight <= 0) return 0
  const cut = scrollHeight - clientHeight
  // Subpixel layout leaves a fraction of a pixel over on boxes that fit, and
  // "1 more line" over nothing is worse than saying nothing at all.
  if (cut <= SLACK_PX) return 0
  return Math.max(1, Math.round(cut / lineHeight))
}

const SLACK_PX = 1

// The line box the browser settled on, in pixels. `line-height: normal`
// computes to the keyword rather than a length, so it is read off the font
// size instead, at the ratio the browsers use for it.
export function lineHeightOf(style: { lineHeight: string; fontSize: string }): number {
  const line = Number.parseFloat(style.lineHeight)
  if (Number.isFinite(line) && line > 0) return line
  const font = Number.parseFloat(style.fontSize)
  return Number.isFinite(font) && font > 0 ? font * NORMAL_RATIO : 0
}

const NORMAL_RATIO = 1.2
