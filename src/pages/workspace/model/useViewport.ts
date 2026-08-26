import { useEffect, useState } from 'react'
import type { Viewport } from '@/widgets/tile-deck'
import { USAGE_BAR } from '@/shared/config/theme'

function measured(): Viewport {
  return { w: window.innerWidth, h: window.innerHeight - USAGE_BAR.height }
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(measured)

  useEffect(() => {
    const onResize = (): void => setViewport(measured())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return viewport
}
