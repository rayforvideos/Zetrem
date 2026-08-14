import { describe, expect, it } from 'vitest'
import { SIDEBAR } from '@/shared/config/theme'
import { clampWidth, draggedWidth, nudgedWidth } from './sidebar-width'

describe('clampWidth — 보드는 읽을 수 있는 폭 안에서만 산다', () => {
  it('너무 좁게도 너무 넓게도 만들 수 없다', () => {
    expect(clampWidth(10)).toBe(SIDEBAR.min)
    expect(clampWidth(9999)).toBe(SIDEBAR.max)
  })

  it('사이 값은 그대로 두되 소수점은 남기지 않는다', () => {
    expect(clampWidth(240.4)).toBe(240)
  })

  it('숫자가 아니면 기본 폭으로 돌아간다 — 저장된 값이 상해도 화면은 선다', () => {
    expect(clampWidth(Number.NaN)).toBe(SIDEBAR.width)
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR.width)
  })
})

describe('draggedWidth — 잡은 자리에서 움직인 만큼', () => {
  it('오른쪽으로 끌면 넓어지고 왼쪽으로 끌면 좁아진다', () => {
    expect(draggedWidth(232, 40)).toBe(272)
    expect(draggedWidth(232, -40)).toBe(192)
  })

  it('끝까지 끌어도 한계를 넘지 않는다', () => {
    expect(draggedWidth(232, -9999)).toBe(SIDEBAR.min)
    expect(draggedWidth(232, 9999)).toBe(SIDEBAR.max)
  })
})

describe('nudgedWidth — 손을 안 쓰고도 옮긴다', () => {
  it('좌우 화살표로 한 칸씩 움직인다', () => {
    expect(nudgedWidth(232, 'ArrowRight')).toBe(232 + SIDEBAR.step)
    expect(nudgedWidth(232, 'ArrowLeft')).toBe(232 - SIDEBAR.step)
  })

  it('Home 과 End 는 양 끝으로 보낸다', () => {
    expect(nudgedWidth(232, 'Home')).toBe(SIDEBAR.min)
    expect(nudgedWidth(232, 'End')).toBe(SIDEBAR.max)
  })

  it('상관없는 키는 아무것도 바꾸지 않는다 — 눌렀다고 다 움직이면 안 된다', () => {
    expect(nudgedWidth(232, 'a')).toBe(null)
    expect(nudgedWidth(232, 'Enter')).toBe(null)
  })
})
