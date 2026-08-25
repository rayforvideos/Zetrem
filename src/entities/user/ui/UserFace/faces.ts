import capsule from '@/entities/user/ui/UserFace/faces/capsule.png'
import ghost from '@/entities/user/ui/UserFace/faces/ghost.png'
import onigiri from '@/entities/user/ui/UserFace/faces/onigiri.png'
import spike from '@/entities/user/ui/UserFace/faces/spike.png'
import triangle from '@/entities/user/ui/UserFace/faces/triangle.png'
import type { FaceId } from '../../lib/face/face.types'

export const FACE_ART: Record<FaceId, string> = {
  onigiri,
  triangle,
  ghost,
  spike,
  capsule,
}
