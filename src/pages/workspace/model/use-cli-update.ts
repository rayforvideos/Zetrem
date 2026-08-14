import { useCallback, useEffect, useRef, useState } from 'react'
import { conversation } from './conversation'
import { statusStore } from '@/entities/agent-session'

/**
 * CLI 버전을 묻고, 사람이 누르면 갱신을 시작한다.
 *
 * 언제 물을지는 세션이 정한다 — 비교할 것이 생기려면 init 의 `cliVersion` 이 와야 하고,
 * 그 값은 스트림에서 비동기로 오므로 나중에 또 바뀌어도 다시 묻지 않도록 ref 로 막는다.
 * 무엇을 "지금 버전" 으로 쓸지는 다르다: 설치된 것(`installed`)이 진실이고 init 값은
 * 그것을 못 읽었을 때의 폴백이다 — 갱신을 마치면 둘이 갈라지기 때문이다.
 *
 * 갱신 결과는 대화의 사건 줄로 남긴다: CLI 가 무슨 말을 했는지 요약하지 않아야
 * (Homebrew 가 관리를 거절하는 말까지 포함해) 사람이 다음 손을 정할 수 있다.
 */
export function useCliUpdate(cliVersion: string | null): { updating: boolean; start(): void } {
  const [updating, setUpdating] = useState(false)
  const asked = useRef(false)
  // 갱신을 마친 뒤 다시 물을 때도 폴백이 필요하다 — 그때는 이 훅이 인자를 새로 못 받는다
  const fallback = useRef<string | null>(null)
  fallback.current = cliVersion

  const query = useCallback(async (): Promise<void> => {
    try {
      const { installed, latest, managedBy } = await window.desk.latestCliVersion()
      statusStore.setUpdate({ current: installed ?? fallback.current, latest, managedBy })
    } catch {
      // 못 물어본 것과 최신인 것은 다르다 — latest 를 null 로 남긴다
      statusStore.setUpdate({ current: fallback.current, latest: null, managedBy: null })
    }
  }, [])

  useEffect(() => {
    if (!cliVersion || asked.current) return
    asked.current = true
    void query()
  }, [cliVersion, query])

  const start = useCallback(() => {
    setUpdating(true)
    window.desk
      .runCliUpdate()
      .then(({ output }) => {
        conversation.system(output)
        // 갱신이 끝났으면 화면에 선 버전은 이미 옛것이다 — 다시 묻지 않으면 "새 버전 있음"
        // 과 갱신하기 버튼이 앱을 다시 띄울 때까지 그대로 남는다.
        //
        // 기다리지 않는다(`return` 없이 띄운다): "갱신 중" 은 갱신 명령이 끝나면 끝나야
        // 하고, 되물음은 그 뒤의 새로고침이지 갱신의 일부가 아니다. 이어 붙이면 아래
        // finally 가 되물음까지 기다리게 되어, 버튼이 다시 "갱신 중…" 에 갇힐 길이 생긴다
        void query()
      })
      .catch(() => conversation.system('갱신을 시작하지 못했습니다'))
      .finally(() => setUpdating(false))
  }, [query])

  return { updating, start }
}
