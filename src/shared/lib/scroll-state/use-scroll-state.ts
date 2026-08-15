import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { atEnd } from './scroll-state'

const QUIET_MS = 700

export function useScrollState<T extends HTMLElement>(): [
  (el: T | null) => void,
  MutableRefObject<T | null>,
] {
  const node = useRef<T | null>(null)
  const stop = useRef<(() => void) | null>(null)

  const attach = useCallback((el: T | null) => {
    stop.current?.()
    stop.current = null
    node.current = el
    if (el === null) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const look = (): void => {
      if (atEnd(el.scrollTop, el.scrollHeight, el.clientHeight)) el.setAttribute('data-at-end', '')
      else el.removeAttribute('data-at-end')
    }

    const onScroll = (): void => {
      el.setAttribute('data-scrolling', '')
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => el.removeAttribute('data-scrolling'), QUIET_MS)
      look()
    }

    look()
    el.addEventListener('scroll', onScroll, { passive: true })
    const resized = new ResizeObserver(look)
    resized.observe(el)
    const changed = new MutationObserver(look)
    changed.observe(el, { childList: true, subtree: true, characterData: true })

    stop.current = () => {
      el.removeEventListener('scroll', onScroll)
      resized.disconnect()
      changed.disconnect()
      if (timer !== null) clearTimeout(timer)
    }
  }, [])

  return [attach, node]
}
