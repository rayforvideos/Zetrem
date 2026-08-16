export const MOCK_WIDTH = 1060

export const MOCK_HEIGHT = 500

const MOST = 0.82

const LEAST = 0.3

export function fitScale(roomW: number, roomH: number): number {
  if (roomW <= 0 || roomH <= 0) return MOST
  const room = Math.min(roomW / MOCK_WIDTH, roomH / MOCK_HEIGHT)
  return Math.max(LEAST, Math.min(MOST, room))
}
