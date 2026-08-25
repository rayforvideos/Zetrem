import { useCallback, useRef, useState } from 'react'

export function useOffsetWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [width, setWidth] = useState(0)
  const stop = useRef<(() => void) | null>(null)

  const attach = useCallback((el: T | null) => {
    stop.current?.()
    stop.current = null
    if (el === null) return
    const read = (): void => setWidth(el.offsetWidth)
    read()
    const watching = new ResizeObserver(read)
    watching.observe(el)
    stop.current = () => watching.disconnect()
  }, [])

  return [attach, width]
}
