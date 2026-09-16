import { Button } from '@/shared/ui/button'
import { Wordmark } from '@/shared/graphics/Wordmark/Wordmark'
import { SPRITES } from '@/entities/teammate/ui/AgentSprite/sprites'
import { ZETREM_HOME } from './links'

// The four the tour is about to show at work, standing still for a moment.
const CAST = ['planet', 'rock', 'star', 'ghost'] as const

const SAID = [
  '왼쪽에서 일을 맡기면, 오른쪽에서 팀이 각자 움직입니다.',
  '팀원이 부른 명령과 읽은 파일이 그때그때 화면에 올라옵니다.',
  '실행 전에는 멈춰서 묻고, 남길 결론은 라이브러리에 쌓입니다.',
]

// The door to the demo. The tour explains the app while it runs; this says
// what the page itself is before anything starts moving, because somebody who
// lands here has no way of knowing they are looking at a recording.
export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/95 p-6 backdrop-blur">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border bg-card p-8 text-center shadow-xl">
        <div className="flex items-end gap-3">
          {CAST.map((one) => (
            <img
              key={one}
              src={SPRITES[one].default}
              alt=""
              width={44}
              height={44}
              draggable={false}
              className="zt-sprite object-contain"
            />
          ))}
        </div>

        <Wordmark width={148} />

        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium">안녕하세요</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            이 페이지는 Zetrem 앱의 기능을 그대로 확인할 수 있는 데모 웹페이지입니다. 실제 세션을
            기록해 재생하며, 보이는 화면은 앱 그 자체입니다. 승인과 라이브러리 수락은 실제로
            동작합니다.
          </p>
        </div>

        <ul className="flex w-full flex-col gap-1.5 text-left text-sm text-muted-foreground">
          {SAID.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="flex w-full flex-col items-center gap-3 pt-1">
          <Button size="lg" className="w-full rounded-full" onClick={onStart}>
            둘러보기 시작
          </Button>
          <a
            href={ZETREM_HOME}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Zetrem 홈페이지
          </a>
        </div>
      </div>
    </div>
  )
}
