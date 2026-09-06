import { useCallback, useState } from 'react'
import type { RefCallback } from 'react'
import { hiddenLines, lineHeightOf } from './clipped'

// How many lines of an element's content are cut off below it, kept current as
// the box is resized and as what is inside it changes. The ref callback hands
// back its own teardown, which React calls when the element is swapped or
// unmounted, so the observers never outlive what they watched.
export function useClipped<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [hidden, setHidden] = useState(0)

  const attach = useCallback<RefCallback<T>>((el) => {
    if (el === null) return
    const read = (): void => {
      const style = window.getComputedStyle(el)
      setHidden(hiddenLines(el.scrollHeight, el.clientHeight, lineHeightOf(style)))
    }
    read()
    const resized = new ResizeObserver(read)
    resized.observe(el)
    // A box already at its cap does not resize when the body inside it gets
    // longer, so the content has to be watched as well as the box.
    const changed = new MutationObserver(read)
    changed.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      resized.disconnect()
      changed.disconnect()
    }
  }, [])

  return [attach, hidden]
}
