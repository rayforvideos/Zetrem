import { Button } from '@/shared/ui/button'
import { Wordmark } from '@/shared/graphics/Wordmark/Wordmark'
import { SPRITES } from '@/entities/teammate/ui/AgentSprite/sprites'
import { ZETREM_HOME } from './links'

// Three of the faces the app gives teammates, each standing for the part of
// the tour it is about to appear in.
const PARTS = [
  {
    character: 'planet',
    title: '맡깁니다',
    body: '다음 단계가 아니라 원하는 결과를 말하면, 오케스트레이터가 쪼개서 팀원에게 나눠 줍니다.',
  },
  {
    character: 'rock',
    title: '지켜봅니다',
    body: '팀원마다 타일이 하나씩. 지금 하는 일과 방금 부른 명령이 그때그때 올라옵니다.',
  },
  {
    character: 'star',
    title: '남깁니다',
    body: '실행 전에는 멈춰서 묻고, 남길 만한 결론은 프로젝트의 라이브러리에 쌓입니다.',
  },
] as const

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="zt-scroll fixed inset-0 z-[70] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <img
          src={SPRITES.bunny.relax}
          alt=""
          width={128}
          height={128}
          draggable={false}
          className="zt-sprite object-contain"
        />

        <div className="flex flex-col items-center gap-4">
          <Wordmark width={216} />
          <p className="text-2xl leading-tight font-medium">안녕하세요</p>
          <p className="max-w-2xl text-base leading-relaxed break-keep text-muted-foreground">
            이 페이지는 Zetrem 앱의 기능을 그대로 확인할 수 있는 데모 웹페이지입니다. 실제 세션을
            기록해 재생하며, 보이는 화면은 앱 그 자체입니다. 승인과 라이브러리 수락은 이 페이지에서
            실제로 동작합니다.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {PARTS.map((part) => (
            <div
              key={part.character}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5"
            >
              <img
                src={SPRITES[part.character].default}
                alt=""
                width={48}
                height={48}
                draggable={false}
                className="zt-sprite object-contain"
              />
              <p className="text-base font-medium">{part.title}</p>
              <p className="text-sm leading-relaxed break-keep text-muted-foreground">
                {part.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button size="lg" className="h-11 rounded-full px-10 text-base" onClick={onStart}>
            둘러보기 시작
          </Button>
          <a
            href={ZETREM_HOME}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Zetrem 홈페이지
          </a>
        </div>
      </div>
    </div>
  )
}
