import wordmarkUrl from '@/shared/assets/wordmark.png'
import { cn } from '@/shared/lib/cn'

/** 자산의 실제 크기 (@2x). 비율을 코드가 알아야 늘어나지 않는다 */
const SOURCE = { width: 720, height: 298 }

/**
 * 두 자리의 시작 숫자 — 실기 캡처(Task 13 Step 7)로 조정될 값이라 한곳에 모아둔다.
 * 설정 화면: 배경 사진과 겨룰 다른 글자가 없으므로 가장 크게 선다.
 * 빈 대화 화면: 세리프 표제가 이미 목소리를 가졌으므로 작고 조용한 서명으로만 선다.
 */
export const WORDMARK_SIZE = {
  setup: 200,
  signature: 100,
} as const

/** 서명 자리의 불투명도 — 표제와 크기로 겨루지 않기 위해 죽여둔다 */
export const WORDMARK_SIGNATURE_OPACITY = 'opacity-40'

/**
 * 붓글씨 이름표.
 *
 * `<img>` 가 아니라 마스크인 이유: 원본은 흰 바탕에 검은 글씨라 어두운 배경 위에서
 * 사라진다. 잉크 모양만 마스크로 쓰고 색은 currentColor 로 칠하면, 이름이 이 앱의
 * 다른 모든 글자와 같은 규칙 아래 놓인다 (시각 스펙 §4.2). 마크일 뿐 목소리가 아니므로
 * 텍스트를 짜지 않고, 화면당 한 번만 선다.
 */
export function Wordmark({ width, className }: { width: number; className?: string }) {
  const height = Math.round((width / SOURCE.width) * SOURCE.height)
  return (
    <span
      role="img"
      aria-label="Zetrem"
      title="Zetrem"
      className={cn('block flex-none bg-current', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maskImage: `url(${wordmarkUrl})`,
        WebkitMaskImage: `url(${wordmarkUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}
