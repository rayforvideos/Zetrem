import { describe, expect, it } from 'vitest'
import { urlFrom } from './cli-output'

const ESC = '\u001B'
const BEL = '\u0007'
const AUTHORIZE = 'https://claude.com/cai/oauth/authorize?code=true&client_id=abc&state=xyz'

const REAL_LOGIN_OUTPUT = [
  'Opening browser to sign in…',
  `If the browser did not open, visit: ${ESC}]8;;${AUTHORIZE}${BEL}${AUTHORIZE}${ESC}]8;;${BEL}`,
  'Paste code here if prompted > ',
].join('\n')

describe('what the CLI meant for a terminal never reaches the screen', () => {
  it('takes the URL out of an OSC 8 hyperlink once, in the shape the CLI really sends', () => {
    expect(urlFrom(REAL_LOGIN_OUTPUT)).toBe(AUTHORIZE)
  })

  it('leaves no control characters in the URL it took', () => {
    const url = urlFrom(REAL_LOGIN_OUTPUT) ?? ''
    expect(url.includes(ESC), 'an ESC was left in').toBe(false)
    expect(url.includes(BEL), 'a BEL was left in').toBe(false)
    expect(url.match(/https?:\/\//g)).toHaveLength(1)
  })

  it('keeps only the URL out of a coloured line', () => {
    expect(urlFrom(`${ESC}[4;34m${AUTHORIZE}${ESC}[0m`)).toBe(AUTHORIZE)
  })

  it('says there is no URL rather than putting any old line on screen', () => {
    expect(urlFrom('Opening browser to sign in…')).toBeNull()
    expect(urlFrom('')).toBeNull()
  })

  it('does not take an escape sequence for part of the address', () => {
    expect(urlFrom(`${ESC}[1m${AUTHORIZE}${ESC}[0m > `)).toBe(AUTHORIZE)
  })
})
