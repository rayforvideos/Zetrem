import { describe, expect, it } from 'vitest'
import { LAYER_SELECTOR, layerOver, typingIn } from './modal'

describe('what counts as something stacked over the page', () => {
  it('names every layer the app can put on top, so Escape does not reach past one', () => {
    expect(LAYER_SELECTOR).toContain('[role="dialog"]')
    expect(LAYER_SELECTOR).toContain('[role="alertdialog"]')
    expect(LAYER_SELECTOR).toContain('[role="menu"]')
    expect(LAYER_SELECTOR, 'radix puts the popover in this wrapper').toContain(
      '[data-radix-popper-content-wrapper]',
    )
  })

  it('asks the page with that one selector and nothing else', () => {
    const asked: string[] = []
    const root = {
      querySelector(selector: string) {
        asked.push(selector)
        return null
      },
    }
    expect(layerOver(root)).toBe(false)
    expect(asked).toEqual([LAYER_SELECTOR])
  })

  it('reports a layer when the page has one', () => {
    expect(layerOver({ querySelector: () => ({}) })).toBe(true)
  })
})

describe('what counts as a key pressed into a field', () => {
  it('leaves the key to a box being typed in, whichever kind it is', () => {
    expect(typingIn({ tagName: 'INPUT' })).toBe(true)
    expect(typingIn({ tagName: 'TEXTAREA' })).toBe(true)
    expect(typingIn({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('takes the key back everywhere else, including where nothing was focused', () => {
    expect(typingIn({ tagName: 'BUTTON' })).toBe(false)
    expect(typingIn({ tagName: 'DIV', isContentEditable: false })).toBe(false)
    expect(typingIn(null)).toBe(false)
  })
})
