const OSC = /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g
const CSI = /\u001B\[[0-9;?]*[ -/]*[@-~]/g
const URL_IN_TEXT = /https?:\/\/[^\s'"<>\u0007\u001B]+/

export function stripAnsi(text: string): string {
  return text.replace(OSC, '').replace(CSI, '')
}

export function urlFrom(text: string): string | null {
  return stripAnsi(text).match(URL_IN_TEXT)?.[0] ?? null
}
