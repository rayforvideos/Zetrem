let stamped = 0

export function freshTurnId(): string {
  stamped += 1
  return `turn-${stamped}`
}
