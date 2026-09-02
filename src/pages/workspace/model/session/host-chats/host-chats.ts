// Which chat a running host belongs to, kept for exactly as long as the
// screen is: nothing here is written to disk, and a restart leaves it empty,
// which is what tells a proposal's card that its session is unknown now
// rather than showing a chat that is no longer this one.
const chatOfHostId = new Map<string, string>()

export function rememberHostChat(hostId: string, chatId: string): void {
  chatOfHostId.set(hostId, chatId)
}

export function chatOfHost(hostId: string): string | null {
  return chatOfHostId.get(hostId) ?? null
}
