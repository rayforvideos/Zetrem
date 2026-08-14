/** 에이전트가 일할 프로젝트. 경로의 소유자는 메인 프로세스고 렌더러는 표시만 한다 */
export type Project = {
  /** 절대 경로. spawn cwd 로 쓰인다 */
  path: string
  /** 타이틀바에 찍히는 이름 — 경로의 마지막 조각 */
  name: string
}
