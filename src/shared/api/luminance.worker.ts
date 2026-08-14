import { sampleLuminance } from '@/shared/lib/luminance'
import type { LuminanceProfile } from '@/shared/lib/luminance'

export type LuminanceRequest = { bitmap: ImageBitmap; cols: number; rows: number }

self.onmessage = (event: MessageEvent<LuminanceRequest>) => {
  const { bitmap, cols, rows } = event.data
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d 컨텍스트를 못 얻었다')
  ctx.drawImage(bitmap, 0, 0)
  const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  const profile: LuminanceProfile = sampleLuminance(image, cols, rows)
  self.postMessage(profile)
  bitmap.close()
}
