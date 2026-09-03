import { useCallback, useState } from 'react'
import type { RefCallback } from 'react'

// An element's own width, kept current as the window and everything beside it
// moves. The ref callback hands back its own teardown, which React calls when the
// element is swapped or unmounted, so the observer never outlives what it watched.
export function useOffsetWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0)

  const attach = useCallback<RefCallback<T>>((el) => {
    if (el === null) return
    const read = (): void => setWidth(el.offsetWidth)
    read()
    const watching = new ResizeObserver(read)
    watching.observe(el)
    return () => watching.disconnect()
  }, [])

  return [attach, width]
}
