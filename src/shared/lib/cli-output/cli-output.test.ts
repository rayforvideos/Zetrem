import { describe, expect, it } from 'vitest'
import { stripAnsi, urlFrom } from './cli-output'

const ESC = '\u001B'
const BEL = '\u0007'
const AUTHORIZE = 'https://claude.com/cai/oauth/authorize?code=true&client_id=abc&state=xyz'

const REAL_LOGIN_OUTPUT = [
  'Opening browser to sign in…',
  `If the browser did not open, visit: ${ESC}]8;;${AUTHORIZE}${BEL}${AUTHORIZE}${ESC}]8;;${BEL}`,
  'Paste code here if prompted > ',
].join('\n')

describe('CLI 가 터미널에 그리려고 넣은 것은 화면에 오지 않는다', () => {
  it('OSC 8 하이퍼링크에서 URL 을 한 번만 꺼낸다 — 실기에서 받은 모양으로', () => {
    expect(urlFrom(REAL_LOGIN_OUTPUT)).toBe(AUTHORIZE)
  })

  it('꺼낸 URL 에 제어문자가 남지 않는다', () => {
    const url = urlFrom(REAL_LOGIN_OUTPUT) ?? ''
    expect(url.includes(ESC), 'ESC 가 남았다').toBe(false)
    expect(url.includes(BEL), 'BEL 이 남았다').toBe(false)
    expect(url.match(/https?:\/\//g)).toHaveLength(1)
  })

  it('색을 입힌 줄에서도 URL 만 남는다', () => {
    expect(urlFrom(`${ESC}[4;34m${AUTHORIZE}${ESC}[0m`)).toBe(AUTHORIZE)
  })

  it('URL 이 없으면 없다고 한다 — 아무 줄이나 화면에 세우지 않는다', () => {
    expect(urlFrom('Opening browser to sign in…')).toBeNull()
    expect(urlFrom('')).toBeNull()
  })

  it('stripAnsi 는 보이는 글자를 지우지 않는다', () => {
    expect(stripAnsi(`${ESC}[1mPaste code${ESC}[0m > `)).toBe('Paste code > ')
  })
})
