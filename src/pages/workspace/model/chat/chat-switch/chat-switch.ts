// A click on the chat that is already open only brings it back on screen (the
// library covers it); any other chat is a swap, which changes what the screen
// shows and nothing else — the chat being left keeps its session and its
// reply.
export function chatSwitch(id: string, openId: string | null): 'return' | 'swap' {
  return id === openId ? 'return' : 'swap'
}
