// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the control bytes is the whole job here, since this is what strips a terminal's escapes
const OSC = /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the control bytes is the whole job here, since this is what strips a terminal's escapes
const CSI = /\u001B\[[0-9;?]*[ -/]*[@-~]/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the control bytes is the whole job here, since this is what strips a terminal's escapes
const URL_IN_TEXT = /https?:\/\/[^\s'"<>\u0007\u001B]+/

function stripAnsi(text: string): string {
  return text.replace(OSC, '').replace(CSI, '')
}

export function urlFrom(text: string): string | null {
  return stripAnsi(text).match(URL_IN_TEXT)?.[0] ?? null
}
