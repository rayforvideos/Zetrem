import type { TourStep } from '@/app/demo/tour/tour.types'

// The walk a first-time visitor is taken on. Every stop waits for them: the
// recorded run is held between stops, so the next thing on screen happens
// because they moved on and not because a timer went off while they read.
// The wording says plainly that this is a recording, since a demo that
// pretends to be live is worse than one that says what it is.
export const DEMO_STEPS: TourStep[] = [
  {
    id: 'ask',
    target: '[data-talk] textarea',
    title: '일 전체를 맡깁니다',
    body: '다음 단계를 지시하는 대신 원하는 결과를 말합니다. 지금 입력되는 문장이 그 예입니다. 누구에게 맡길지는 오케스트레이터가 정합니다.',
    advance: 'manual',
    placement: 'top',
  },
  {
    id: 'crew',
    target: '[data-card]',
    title: '팀원마다 타일 하나',
    body: '세 명이 동시에 붙었습니다. 타일에 이름과 지금 하는 일, 방금 부른 도구가 올라옵니다. 터미널이라면 이 셋의 출력이 한 줄기로 뒤섞였을 자리입니다.',
    advance: 'manual',
    placement: 'bottom',
  },
  {
    id: 'approval',
    target: '[data-approval]',
    title: '실행 전에 멈춰서 묻습니다',
    body: '팀원이 명령을 실행하려 합니다. 세션은 여기서 멈춰 답을 기다립니다. 허용을 눌러야 다음이 이어집니다.',
    advance: 'click',
    placement: 'right',
  },
  {
    id: 'report',
    target: 'article',
    title: '보고가 한 답변으로 합쳐집니다',
    body: '팀원들이 각자 결론을 올리면 오케스트레이터가 받아 하나로 정리합니다. 도착하는 대로 이 자리에 놓입니다.',
    advance: 'manual',
    placement: 'top',
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
    body: '팀원이 올린 제안입니다. 저절로 저장되는 것은 없습니다. 받아들이면 그때 노트가 됩니다.',
    advance: 'click',
    placement: 'bottom',
  },
  {
    id: 'git-open',
    target: '[data-git-button]',
    title: '프로젝트의 git 도 여기에',
    body: '팀원들이 각자 브랜치에서 일하고 돌아온 자리입니다. 눌러서 열어보세요.',
    advance: 'click',
    placement: 'bottom',
  },
  {
    id: 'git-graph',
    target: '[data-git-row]',
    title: '누가 무엇을 합쳤는지 보입니다',
    body: '본선 옆으로 갈라졌다 합쳐지는 가지 하나하나가 팀원이 끝내고 돌아온 일입니다. 커밋을 누르면 바뀐 파일과 diff 까지 그 자리에서 봅니다.',
    advance: 'manual',
    placement: 'right',
  },
  {
    id: 'settings-open',
    target: '[data-settings-button]',
    title: '무엇까지 맡길지 정합니다',
    body: '계정, 프로젝트, 모델, 그리고 묻지 않고 어디까지 해도 되는지. 눌러서 열어보세요.',
    advance: 'click',
    placement: 'bottom',
  },
  {
    id: 'settings-session',
    target: '[data-setup-section="session"]',
    title: '권한과 모델은 여기서',
    body: '계획 먼저 · 먼저 묻기 · 자동 편집 · 전부 허용 중에 고르고, 모델과 노력 수준도 정합니다. 다음 세션부터 그대로 적용됩니다.',
    advance: 'manual',
    placement: 'left',
  },
  {
    id: 'outro',
    target: null,
    title: '여기까지입니다',
    body: '실제 앱은 여러분 컴퓨터의 Claude Code 를 그대로 실행합니다. 대화도 팀원도 라이브러리도 전부 로컬에 남고, 로그인은 CLI 가 관리합니다. 내려받기와 자세한 소개는 Zetrem 홈페이지에 있습니다.',
    advance: 'manual',
  },
]
