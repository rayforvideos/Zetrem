import type { LuminanceProfile } from '@/shared/lib/luminance'

/** 샘플링 격자. 타일 6개 배치에서 타일마다 최소 몇 셀은 덮이는 해상도 */
const COLS = 16
const ROWS = 12

/**
 * 배경 밝기 분석을 워커로 보낸다.
 * 렌더 루프에서 픽셀을 읽지 않기 위한 경계다 (스펙 §6.5).
 */
export async function sampleBackdropLuminance(url: string): Promise<LuminanceProfile> {
  const response = await fetch(url)
  const bitmap = await createImageBitmap(await response.blob())
  const worker = new Worker(new URL('./luminance.worker.ts', import.meta.url), {
    type: 'module',
  })
  try {
    return await new Promise<LuminanceProfile>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<LuminanceProfile>) => resolve(event.data)
      worker.onerror = (event) => reject(new Error(event.message))
      worker.postMessage({ bitmap, cols: COLS, rows: ROWS }, [bitmap])
    })
  } finally {
    worker.terminate()
  }
}
