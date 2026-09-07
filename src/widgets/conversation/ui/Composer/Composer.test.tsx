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
      runningPermissionMode={null}
      runningModel={null}
      onRestart={() => {}}
      model="default"
      effort="default"
      refusedModels={[]}
      enterSends
      library
      files={[]}
      onPick={() => {}}
      onTake={() => {}}
      onDropFile={() => {}}
      onSend={() => {}}
      onStop={() => {}}
      onClearAddressee={() => {}}
      onPermissionMode={() => {}}
      onModel={() => {}}
      onEffort={() => {}}
      onLibrary={() => {}}
      {...props}
    />,
  )
}

describe('Composer: the line you type into', () => {
  it('is visible as its own box, whatever ground sits behind it', () => {
    // The box itself, not the controls inside it: the library switch carries a
    // transparent border of its own and says nothing about the box.
    const group = /data-slot="input-group"[^>]*class="([^"]*)"/.exec(box())?.[1] ?? ''
    expect(group).toContain('border-border')
    expect(group).not.toContain('border-transparent')
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

  it('offers the permission, model and effort pickers where you type, not in a settings screen', () => {
    const html = box()
    expect(html).toContain('Permissions')
    expect(html).toContain('Default')
    expect(html).not.toContain('aria-label="Effort"')
  })

  it('has the library switch where you type, reading on or off without a press', () => {
    const on = box()
    expect(on).toMatch(/role="switch"[^>]*aria-checked="true"[^>]*data-library-toggle/)
    expect(on).toContain('Library on')
    const off = box({ library: false })
    expect(off).toMatch(/role="switch"[^>]*aria-checked="false"[^>]*data-library-toggle/)
    expect(off).toContain('Library off')
  })

  it('shows a chosen effort beside the model, and nothing when it is left to the CLI', () => {
    expect(box()).not.toContain('data-sub-choice')
    expect(box({ effort: 'high' })).toMatch(/data-sub-choice[^>]*>[\s\S]*?High/)
  })

  it('shows the shortcut that sends, since the button is not the only way', () => {
    expect(box()).toContain('Enter')
  })
})

describe('the chips say what is in force, not what was last picked', () => {
  it('says the pick alone while the running session agrees with it', () => {
    const html = box({ permissionMode: 'ask', runningPermissionMode: 'ask' })
    expect(html).toContain('Ask first')
    expect(html).not.toContain('data-stale')
    expect(html).not.toContain('(next session)')
  })

  it('says the pick alone when there is no session to disagree', () => {
    expect(box({ permissionMode: 'ask', runningPermissionMode: null })).not.toContain('data-stale')
  })

  it('names both, running first, while the session is still on the old mode', () => {
    const html = box({ permissionMode: 'ask', runningPermissionMode: 'bypass' })
    expect(html).toContain('data-stale')
    expect(html).toMatch(/Allow all[\s\S]*?→[\s\S]*?Ask first[\s\S]*?\(next session\)/)
  })

  it('says it in the app words, never in the ones the CLI uses', () => {
    const html = box({ permissionMode: 'ask', runningPermissionMode: 'bypass' })
    expect(html).not.toContain('bypassPermissions')
    expect(html).not.toContain('acceptEdits')
  })

  it('warns about a model the session is not on either', () => {
    const html = box({ model: 'opus', runningModel: 'haiku' })
    expect(html).toMatch(/Haiku[\s\S]*?→[\s\S]*?Opus/)
  })

  // The menu itself is only in the document once it is opened, so what can be
  // read off a closed composer is the trigger: its tone, its two values and
  // the sentence it hands anyone who stops on it.
  it('says on the chip itself what is running and what would change it', () => {
    expect(box({ permissionMode: 'ask', runningPermissionMode: 'bypass' })).toContain(
      'title="The running session is on Allow all. Restart it to work under Ask first."',
    )
  })
})

describe('Composer: the field has a name of its own', () => {
  it('names the field, since a placeholder disappears the moment you type', () => {
    expect(box()).toContain('aria-label="Message your team"')
  })

  it('names whom it is for once someone has been picked', () => {
    expect(box({ addressee: 'Siena' })).toContain('aria-label="Message for Siena"')
  })
})

describe('what you attached, before you send it', () => {
  const shot = {
    path: '/w/shot.png',
    name: 'shot.png',
    kind: 'image' as const,
    bytes: 400,
    mediaType: 'image/png',
    data: 'AAAA',
  }

  it('has a way to attach something at all', () => {
    expect(box()).toContain('aria-label="Attach a file"')
  })

  it('shows a picture as a picture, with a way to take it back off', () => {
    const out = box({ files: [shot] })
    expect(out).toContain('data:image/png;base64,AAAA')
    expect(out).toContain('aria-label="Remove shot.png"')
  })

  it('will send with nothing typed, so a picture can be the whole message', () => {
    expect(box({ files: [shot] })).not.toContain('aria-label="Send" disabled')
    expect(box()).toContain('disabled')
  })

  it('shows a file by name rather than pretending to preview it', () => {
    const out = box({
      files: [
        { ...shot, path: '/w/a.md', name: 'a.md', kind: 'file', mediaType: null, data: null },
      ],
    })
    expect(out).toContain('a.md')
    expect(out).not.toContain('data:')
  })
})

describe('the send hint matches the key that actually sends', () => {
  it('shows a bare Enter while Enter sends', () => {
    const html = box()
    expect(html).toContain('>Enter<')
    expect(html).not.toContain('>⌘<')
    expect(html).not.toContain('>Ctrl<')
  })

  it('shows the modifier when sending takes it', () => {
    const html = box({ enterSends: false })
    expect(/>⌘<|>Ctrl</.test(html)).toBe(true)
  })
})
