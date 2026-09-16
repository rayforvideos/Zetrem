// The demo types the ask the way a person would, letter by letter, so the
// first thing a visitor sees is the app being used rather than a screenshot
// of it. React owns the box's value, so the native setter is called before the
// input event: assigning `.value` alone leaves React's copy of it behind.
// Typed in small runs rather than one letter at a time. Every change is a real
// input event and the screen re-renders on each, so a letter a tick is slower
// on screen than a person typing, which is the opposite of what it should look like.
const RUN = 6
const TYPE_MS = 110

function setValue(field: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function until<T>(find: () => T | null, tries = 80): Promise<T | null> {
  for (let n = 0; n < tries; n += 1) {
    const found = find()
    if (found) return found
    await wait(100)
  }
  return null
}

export function composer(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>('[data-talk] textarea, textarea')
}

export async function typeAndSend(text: string): Promise<void> {
  const field = await until(composer)
  if (!field) return
  field.focus()
  for (let n = RUN; n < text.length + RUN; n += RUN) {
    setValue(field, text.slice(0, Math.min(n, text.length)))
    await wait(TYPE_MS)
  }
  await wait(500)
  // The send button rather than a synthetic Enter: a key event the page did
  // not trust never reaches the box's own handler, and the form's submit is
  // the one path that is certain to be the app's own.
  const send = field.closest('form')?.querySelector<HTMLButtonElement>('button[type="submit"]')
  send?.click()
}
