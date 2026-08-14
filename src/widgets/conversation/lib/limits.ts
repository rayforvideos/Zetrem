/**
 * 눈금을 펼쳤을 때 한 판이 낼 수 있는 줄의 상한.
 *
 * 두 자리(도구 stdout, 전용 diff)가 같은 수를 써야 하는 이유는 화면의 약속이 하나이기
 * 때문이다: 자를 때는 **몇 줄이 남았는지 말한다**. 큰 파일을 쓴 `Write` 하나가 수천 개의
 * 행을 DOM 에 세우면 판 전체가 굳는데, 그것을 막자고 조용히 자르면 화면이 거짓말한다.
 */
export const TOOL_OUTPUT_LINES = 40

/** 잘린 뒤 남은 줄을 말로 남긴다 — 침묵으로 자르지 않는다 */
export function moreLine(rest: number): string {
  return `… ${rest}줄 더 있음`
}
