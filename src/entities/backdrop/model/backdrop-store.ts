import type { Backdrop, BackdropState } from './backdrop'

type Listener = () => void

/**
 * 배경 사진 하나만 상태로 둔다.
 *
 * 유리는 늘 **얇고 어두운 유리**다 — 색을 고르는 토글도, 두께·배경 어둡기 슬라이더도 없다
 * (2026-08-13 사용자 요청: "유리 배경 자동 어둡게 이런거 필요없어").
 * 어둡기는 유리가 제 자리의 배경만 눌러서 만든다(backdrop-filter brightness). 그래서
 * 조절할 것이 남지 않는다 — 어떤 사진 위에서도 같은 판이 서고, 대비는 계산이 보증한다.
 */
let state: BackdropState = { backdrop: null }
const listeners = new Set<Listener>()

function emit(next: BackdropState): void {
  state = next
  for (const listener of listeners) listener()
}

export const backdropStore = {
  /** useSyncExternalStore 가 참조 동일성으로 재렌더를 판정하므로 같은 객체를 돌려준다 */
  get(): BackdropState {
    return state
  },
  set(backdrop: Backdrop | null): void {
    // 배경을 갈아치우면 앞의 blob: 이 붙들고 있던 바이트를 놓아준다.
    // 현재 배경의 소유자가 이 스토어이므로 해제도 여기 책임이다
    const previous = state.backdrop?.url
    if (previous && previous !== backdrop?.url && previous.startsWith('blob:')) {
      URL.revokeObjectURL(previous)
    }
    emit({ ...state, backdrop })
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
