import type { Persona } from '@/entities/agent-session'

// 둥근 덩어리에 작은 귀 둘, 한쪽으로 몰린 세로 점 눈. 원 안에 눈을 찍던 예전 얼굴은
// 아이콘이었고 이건 캐릭터다 — 실루엣이 좌우로 살짝 눌려 있어야 덩어리로 읽힌다.
//
// 색조는 역할에서 나오고(personaOf), 눈이 어디를 보는지와 귀 크기는 face 로 갈린다.
// 색을 들이지 않는다는 규칙의 예외가 이 얼굴이다 (docs/direction.md).
const BODY =
  'M 2.1 14.6 C 2.1 9.4 6.4 6.2 12 6.2 C 17.6 6.2 21.9 9.4 21.9 14.6 C 21.9 18.9 17.8 20.9 12 20.9 C 6.2 20.9 2.1 18.9 2.1 14.6 Z'

const EAR = [
  { x: 7.4, y: 7.4 },
  { x: 16.6, y: 7.4 },
]

type Look = { at: number; lift: number; ear: number }

const LOOKS: Look[] = [
  { at: 2.8, lift: 0, ear: 2.1 },
  { at: -2.8, lift: 0, ear: 2.1 },
  { at: 0.2, lift: 0.5, ear: 2.4 },
  { at: 4.2, lift: -0.4, ear: 1.9 },
]

export function AgentFace({ persona, size = 20 }: { persona: Persona; size?: number }) {
  const skin = `hsl(${persona.hue} 48% 56%)`
  const edge = `hsl(${persona.hue} 42% 36%)`
  const ink = `hsl(${persona.hue} 45% 9%)`
  const look = LOOKS[persona.face % LOOKS.length] as Look

  const left = 11.2 + look.at
  const right = left + 2.9
  const top = 12 + look.lift

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={persona.name}
      style={{ flex: 'none', display: 'block' }}
    >
      <g stroke={edge} strokeWidth="1.1">
        {EAR.map((ear) => (
          <circle key={ear.x} cx={ear.x} cy={ear.y} r={look.ear} fill={skin} />
        ))}
        <path d={BODY} fill={skin} />
      </g>
      <g fill={ink}>
        <rect x={left - 0.65} y={top} width="1.3" height="3" rx="0.65" />
        <rect x={right - 0.65} y={top + 0.6} width="1.3" height="3" rx="0.65" />
      </g>
    </svg>
  )
}
