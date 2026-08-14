import { ChevronDown, ChevronUp } from 'lucide-react'
import type { StatusState } from '@/entities/agent-session'
import { cn } from '@/shared/lib/cn'
import { cells } from '../lib/format'

/**
 * 상시 보이는 한 줄 — TUI 의 상태줄 자리다.
 *
 * 규칙 셋: ① 모르는 칸은 아예 없다 (자리를 비워두면 값이 채워질 때 줄이 흔들린다)
 * ② 경고는 색이 아니라 문장과 선 굵기 (§4.2 — 글자는 100% currentColor)
 * ③ 숫자는 tabular-nums.
 */
type StatusBarProps = {
  status: StatusState
  open: boolean
  onToggle(): void
}

export function StatusBar({ status, open, onToggle }: StatusBarProps) {
  const items = cells(status)

  return (
    <div className="flex flex-none items-center gap-2.5 border-t border-current/10 pt-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        {items.map((cell) => (
          <span
            key={cell.key}
            className={cn(
              'flex-none truncate font-mono text-[10.5px] tracking-wide tabular-nums',
              // 경고는 어절이 길어지고 선이 생긴다 — 색은 들이지 않는다
              cell.warn
                ? 'rounded-full border border-current/40 px-1.5 py-px opacity-100'
                : 'opacity-60',
            )}
          >
            {cell.text}
          </span>
        ))}
      </div>
      {/* 손잡이는 늘 오른쪽 같은 자리다 — 칸이 늘어도 눈이 다시 찾지 않게 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="세션 명세"
        className="zt-btn zt-btn--ghost zt-btn--sm flex-none"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </button>
    </div>
  )
}
