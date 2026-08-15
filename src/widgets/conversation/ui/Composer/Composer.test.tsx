import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Composer } from './Composer'

function box(props: Partial<Parameters<typeof Composer>[0]> = {}): string {
  return renderToStaticMarkup(
    <Composer
      empty
      busy={false}
      sessionLive={false}
      addressee={null}
      permissionMode="ask"
      model="default"
      onSend={() => {}}
      onStop={() => {}}
      onClearAddressee={() => {}}
      onPermissionMode={() => {}}
      onModel={() => {}}
      {...props}
    />,
  )
}

describe('Composer: the line you type into', () => {
  it('is visible as its own box, whatever ground sits behind it', () => {
    const html = box()
    expect(html).toContain('border-border')
    expect(html).not.toContain('border-transparent')
  })

  it('asks what to work on before there is a conversation', () => {
    expect(box({ empty: true })).toContain('What should they work on?')
  })

  it('asks to keep going once there is one', () => {
    expect(box({ empty: false })).toContain('Keep going')
  })

  it('puts the named person above the box and asks for them by name', () => {
    const html = box({ addressee: 'Explore' })
    expect(html).toContain('To Explore')
    expect(html).toContain('Task for Explore')
  })

  it('offers stop instead of send while the work is running', () => {
    expect(box({ busy: true })).toContain('aria-label="Stop"')
    expect(box({ busy: false })).toContain('aria-label="Send"')
  })

  it('will not send an empty message', () => {
    expect(box()).toContain('disabled=""')
  })

  it('offers the permission and model pickers where you type, not in a settings screen', () => {
    const html = box()
    expect(html).toContain('Permissions')
    expect(html).toContain('Default')
  })

  it('shows the shortcut that sends, since the button is not the only way', () => {
    expect(box()).toContain('Enter')
  })
})
