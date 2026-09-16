import type { TourStep } from '@/app/demo/tour/tour.types'

// What a first-time visitor is walked through. The wording says plainly that
// this page replays a recorded session, because a demo that pretends to be
// live is worse than one that says what it is.
export const DEMO_STEPS: TourStep[] = [
  {
    id: 'intro',
    target: null,
    title: 'Zetrem 둘러보기',
    body: 'Zetrem 은 Claude Code 에이전트 팀을 화면에서 다루는 데스크톱 앱입니다. 이름을 붙인 팀원에게 일을 맡기고, 각자 무엇을 하는지 보고, 승인이 필요할 때 답합니다. 이 페이지는 실제 세션을 기록해 그대로 재생하며, 화면은 앱 그 자체입니다. 2분이면 끝납니다.',
    advance: 'manual',
  },
  {
    id: 'ask',
    target: '[data-talk] textarea',
    title: '일 전체를 맡깁니다',
    body: '다음 단계를 지시하는 대신 원하는 결과를 말합니다. 지금 입력되고 있는 문장이 그 예입니다. 오케스트레이터가 알아서 쪼개고 누구에게 맡길지 정합니다.',
    advance: 'auto',
    delayMs: 4200,
    placement: 'top',
  },
  {
    id: 'crew',
    target: '[data-card]',
    title: '팀원마다 타일 하나',
    body: '세 명이 동시에 움직입니다. 타일에는 이름과 지금 하는 일, 방금 부른 도구가 실시간으로 올라옵니다. 터미널이라면 이 셋의 출력이 한 줄기로 뒤섞였을 자리입니다.',
    advance: 'auto',
    delayMs: 6000,
    placement: 'bottom',
  },
  {
    id: 'approval',
    target: '[data-approval]',
    title: '승인이 필요하면 멈춰서 묻습니다',
    body: '명령을 실행하기 전에 세션이 여기서 멈춰 사용자를 기다립니다. 실제로 눌러보세요. 허용을 누르면 그때부터 다시 움직입니다.',
    advance: 'click',
    placement: 'right',
  },
  {
    id: 'report',
    target: '[data-talk]',
    title: '보고가 하나로 정리됩니다',
    body: '팀원들이 각자 끝낸 결론을 오케스트레이터가 받아 한 답변으로 묶습니다. 답변 아래의 「라이브러리에 담기」로 그대로 프로젝트 노트에 넣을 수 있습니다.',
    advance: 'auto',
    delayMs: 9000,
    placement: 'left',
  },
  {
    id: 'library-open',
    target: '[data-library-row]',
    title: '프로젝트의 라이브러리',
    body: '세션이 일하다 남길 만한 결론을 찾으면 제안으로 올립니다. 저절로 저장되는 것은 없습니다. 눌러서 열어보세요.',
    advance: 'click',
    placement: 'right',
  },
  {
    id: 'proposal',
    target: '[data-proposals]',
    title: '받아들일지는 사람이 정합니다',
    body: '에이전트가 올린 제안입니다. 받아들이면 그때 노트가 되고, 무시하면 사라집니다. 눌러보세요.',
    advance: 'click',
    placement: 'bottom',
  },
  {
    id: 'outro',
    target: null,
    title: '여기까지입니다',
    body: '실제 앱은 여러분 컴퓨터의 Claude Code 를 그대로 실행합니다. 대화도 팀원도 라이브러리도 전부 로컬에 저장되고, 로그인은 CLI 가 관리합니다. 소스와 내려받기는 github.com/rayforvideos/Zetrem 에 있습니다.',
    advance: 'manual',
  },
]
