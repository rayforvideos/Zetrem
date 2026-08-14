import { useEffect, useState } from 'react'
import type { Viewport } from '@/widgets/tile-deck'

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }))

  useEffect(() => {
    function onResize(): void {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return viewport
}
