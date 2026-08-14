import { sampleBackdropLuminance } from '@/shared/api/luminance-worker'
import type { PickedBackdropFile } from '@/shared/api/desk'
import type { Backdrop } from '../model/backdrop'

/** 파일 다이얼로그를 열고, 고른 이미지를 밝기 프로필까지 붙여 도메인 형태로 돌려준다 */
export async function pickBackdrop(): Promise<Backdrop | null> {
  return toBackdrop(await window.desk.pickBackdropFile())
}

/**
 * 지난 세션의 배경을 되살린다. 기억이 없거나 파일이 사라졌으면 null —
 * 그때는 폴백 그라디언트로 시작하면 되므로 오류가 아니다.
 */
export async function restoreBackdrop(): Promise<Backdrop | null> {
  return toBackdrop(await window.desk.restoreBackdropFile())
}

async function toBackdrop(file: PickedBackdropFile | null): Promise<Backdrop | null> {
  if (!file) return null

  // blob: 은 http 오리진에서도 읽히고 이스케이프할 경로가 없다 (근거는 shared/api/desk.ts)
  const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mime }))
  try {
    return { url, profile: await sampleBackdropLuminance(url) }
  } catch (cause) {
    // 분석이 실패하면 이 URL 을 쓸 곳이 없다. 잡아둔 바이트를 놓아준다
    URL.revokeObjectURL(url)
    throw cause
  }
}
