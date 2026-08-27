export const WIKILINK_PREFIX = '#vault/'

const CODE = /(```[\s\S]*?```|`[^`\n]*`)/g
const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

function hrefOf(name: string): string {
  return encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function linkPlain(text: string, titles: ReadonlySet<string>): string {
  return text.replace(LINK, (_all, rawName: string, alias?: string) => {
    const name = rawName.trim()
    const shown = (alias ?? name).trim()
    if (!titles.has(name)) return shown
    return `[${shown}](${WIKILINK_PREFIX}${hrefOf(name)})`
  })
}

export function linked(text: string, titles: ReadonlySet<string>): string {
  return text
    .split(CODE)
    .map((part, at) => (at % 2 === 1 ? part : linkPlain(part, titles)))
    .join('')
}

export function noteTitleOf(href: string): string | null {
  if (!href.startsWith(WIKILINK_PREFIX)) return null
  try {
    return decodeURIComponent(href.slice(WIKILINK_PREFIX.length))
  } catch {
    return null
  }
}
