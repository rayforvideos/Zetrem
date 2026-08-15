import { useEffect, useState } from 'react'
import type { Viewport } from '@/widgets/tile-deck'
import { USAGE_BAR } from '@/shared/config/theme'

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => ({
    w: window.innerWidth,
    h: window.innerHeight - USAGE_BAR.height,
  }))

  useEffect(() => {
    function onResize(): void {
      setViewport({ w: window.innerWidth, h: window.innerHeight - USAGE_BAR.height })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return viewport
}
