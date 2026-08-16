import { cn } from '@/shared/lib/cn'
import type { FaceId } from '../../lib/face/face.types'
import { FACE_ART } from './faces'

export function UserFace({
  face,
  size = 24,
  className,
}: {
  face: FaceId
  size?: number
  className?: string
}) {
  return (
    <img
      src={FACE_ART[face]}
      alt={face}
      width={size}
      height={size}
      draggable={false}
      className={cn('flex-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}
