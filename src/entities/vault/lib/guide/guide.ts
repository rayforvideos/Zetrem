export const GUIDE_ID = 'CLAUDE.md'

export function isGuide(id: string | null): boolean {
  return id === GUIDE_ID
}
