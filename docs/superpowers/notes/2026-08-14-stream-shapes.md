# 실측 — thinking 과 compact_boundary (claude 2.1.231)

- 작성일: 2026-08-14
- 환경: macOS (darwin 25.5.0), `claude 2.1.231 (Claude Code)`, Homebrew Caskroom 설치
  (`/opt/homebrew/bin/claude` → `/opt/homebrew/Caskroom/claude-code@latest/2.1.231/claude`)
- 프로브 위치: `/tmp/zt-probe` (저장소 밖, 저장소는 건드리지 않음)

## thinking

명령:

```bash
mkdir -p /tmp/zt-probe && cd /tmp/zt-probe
echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"17 * 23 을 암산으로 단계별로 깊이 생각해서 풀어줘."}]}}' \
  | claude -p --input-format stream-json --output-format stream-json --verbose \
    --include-partial-messages --dangerously-skip-permissions > think.jsonl 2>/dev/null
```

파싱 스크립트가 찍은 요약:

```
BLOCK_START thinking
DELTA thinking_delta
DELTA signature_delta
ASSISTANT blocks: ['thinking']
  thinking_tokens: None
BLOCK_START text
DELTA text_delta
DELTA text_delta
DELTA text_delta
DELTA text_delta
ASSISTANT blocks: ['text']
  thinking_tokens: None
```

같은 이벤트를 원본 JSON 형태로 그대로 옮기면 (서명·본문 긴 필드만 표시상 잘랐고, 자르지 않은 필드는
실제 값 그대로다):

```json
{"type": "stream_event", "event": {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": "", "signature": ""}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "", "estimated_tokens": null}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "CAISuwIKhwEIEBgCKkAMGXpbzaqT/lYSS7BUg77KV+MfDn8FWCfmQmo4Rtyo...(truncated)"}}}
{"type": "assistant", "message": {"content": [{"type": "thinking", "thinking": "", "signature": "CAISuwIKhwEIEBgCKkAM...(truncated)"}], "usage": {"input_tokens": 2, "cache_creation_input_tokens": 11594, "cache_read_input_tokens": 16671, "cache_creation": {"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": 11594}, "output_tokens": 3, "service_tier": "standard", "inference_geo": "not_available"}}}
{"type": "stream_event", "event": {"type": "content_block_stop", "index": 0}}
{"type": "stream_event", "event": {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "17 × 23 = **391**\n\n암"}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "산 단계:\n\n1. **23을 쪼갠다** → 23 = 20 + 3\n2. **17 × 20** = "}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "17 × 2 × 10 = 34 × 10 = **340**\n3. **17 × 3** = **51**\n4. **...(truncated)"}}}
{"type": "stream_event", "event": {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "로): 17 × 23 = (20 − 3) × 23 = 460 − 69 = 391 ✓"}}}
{"type": "assistant", "message": {"content": [{"type": "text", "text": "17 × 23 = **391**\n\n암산 단계:\n\n1. **23을 쪼갠다** → 23 = 20 + 3\n2. **17 × 20** = 17 × 2 × 10 = 34 × 10 = **340**\n3. **17 × 3** = **51**\n4. **더한다** → 340 + 51 = **391**\n\n검산 (다른 경로): 17 × 23 = (20 − 3) × 23 = 460 − 69 = 391 ✓"}], "usage": {...}}}
{"type": "stream_event", "event": {"type": "content_block_stop", "index": 1}}
```

여기서 눈에 띄는 부분: **`thinking` 블록은 있지만 `thinking` 텍스트 값 자체는 빈 문자열이다.**
`content_block_start`, `thinking_delta`, 확정 `assistant.message.content[0]` 모두 `"thinking": ""`
이고 실제로 채워지는 필드는 `signature` 뿐이다. 이 모델(암산 같은 단순 산술)은 추론을 사람이 읽는
텍스트로 스트리밍하지 않고, 서명만 있는 빈 thinking 블록을 낸 뒤 바로 답을 텍스트 블록으로 낸 것으로
보인다. 이것은 브리프가 말한 "thinking 블록이 전혀 없는" 경우가 아니라 — 블록 타입 자체는 양쪽 경로
모두에 존재한다 — "블록은 있는데 본문이 빈" 경우라서, 재시도 조건(블록이 아예 없을 때)에 해당하지
않는다. 재프로브는 하지 않았다.

**결론:** thinking 은 확정 `assistant.message.content` 에도 오고(`type:"thinking"` 블록으로),
동시에 `stream_event` 로도 온다(`content_block_start`의 `content_block.type:"thinking"`,
`content_block_delta`의 `thinking_delta`/`signature_delta`). 다만 이번 프롬프트에서는 `thinking`
필드 값이 비어 있고 `signature` 만 채워졌다 — 파서는 빈 문자열도 유효한 값으로 받아들여야 한다.
→ 파서 `turn.ts` 는 **양쪽**에서 읽는다: 최종 렌더링(과거 턴 재구성)은 확정 `assistant` 메시지의
`thinking` 블록에서, 실시간 스트리밍 표시는 `stream_event`의 `thinking_delta`에서 읽는다. `thinking`
문자열이 빈 값일 수 있으므로 "thinking 블록 존재 = 텍스트가 있다"고 가정하지 않는다.

> **뒤에 내려진 판정 (2026-08-14, 이 문단이 이 문서에서 유일하게 뒤집힌 부분):** 위의 "양쪽에서
> 읽는다" 는 채택되지 않았다. 델타와 확정 메시지는 **같은 내용을 두 번** 실어 나른다 — 둘 다
> 읽으면 생각이 두 벌로 그려진다 (본문 텍스트에서 실제로 그랬고, 그래서 초안(`draft`)은 확정본이
> 오면 버려진다). 그래서 `turn.ts` 는 생각을 **확정 `assistant` 메시지에서만** 읽고
> `thinking_delta` 는 보지 않는다. 이 문서를 근거로 `thinking_delta` 읽기를 "복원" 하면 그 버그를
> 되살리는 것이다. 위 실측 자체(블록은 있고 본문이 빌 수 있다)는 그대로 유효하고, 파서가 빈
> 문자열이면 아무 이벤트도 내지 않는 근거로 살아 있다.

## compact_boundary

명령:

```bash
strings $(readlink -f $(which claude)) | grep -oE 'compact_boundary[^"]{0,80}|"trigger":"[a-z_]+"|pre_tokens|preTokens' | sort -u | head
```

출력:

```
"trigger":"skip"
compact_boundary
compact_boundary, which reports the post-compaction transcript boundary after completion. From i
compact_boundary1
compact_boundary2
compact_boundaryx
pre_tokens
preTokens
```

`compact_boundary1`/`2`/`x` 는 minify 된 변수명이 우연히 붙은 것이라 필드가 아니다. 필드 모양을 보려면
zod 스키마 정의를 직접 찾아야 했다:

```bash
strings $(readlink -f $(which claude)) | grep -oE '.{0,20}compact_metadata:Se\(\{[^}]*\}[^)]*\)*' | sort -u | head -20
```

출력 (그대로):

```
"compact_boundary"),compact_metadata:Se({trigger:Mr(["manual","auto"]),pre_tokens:ct().int(),post_tokens:ct().int().optional(),cumulative_dropped_tokens:ct().int().optional().describe("@internal Running total of context tokens compaction has removed so far, across this and every earlier compaction. "+"Each contribution is approximately pre_tokens − post_tokens."),duration_ms:ct().int().optional(),user_context:N().optional().describe('@internal User-provided focus text for manual "summarize from here".'),messages_summarized:ct().int().optional().describe("@internal Count of messages the compaction summarized."),precomputed:qt().optional().describe("@internal The summary was generated in the background at the autocompact threshold and swapped in when prompt-too-long fired; duration_ms measures user-wait from that point."),pre_compact_discovered_tools:gt(N()).optional().describe("@internal Deferred-tool names discovered before this compaction. extractDiscoveredToolNames reads this back on the next turn so the tool-schema filter keeps including them after the tool_reference-carrying messages were summarized away."),preserved_segment:Se({head_uuid:ou(),anchor_uuid:ou(),tail_uuid:ou()})
```

정리하면 이벤트는 `{"type":"system","subtype":"compact_boundary","compact_metadata":{...}}` 형태고,
`compact_metadata` 의 zod 스키마는:

- `trigger`: `"manual" | "auto"` — 필수
- `pre_tokens`: 정수 — 필수
- `post_tokens`: 정수 — 선택
- `cumulative_dropped_tokens`: 정수 — 선택, `@internal` 표시 (지금까지 모든 압축이 지운 토큰 총합)
- `duration_ms`: 정수 — 선택
- `user_context`: 문자열 — 선택, `@internal` (수동 "summarize from here" 의 포커스 텍스트)
- `messages_summarized`: 정수 — 선택, `@internal`
- `precomputed`: 불리언류 — 선택, `@internal`
- `pre_compact_discovered_tools`: 문자열 배열 — 선택, `@internal`
- `preserved_segment`: `{head_uuid, anchor_uuid, tail_uuid}` 객체

**결론:** 함께 오는 필드는 위 목록이고, 필수는 `trigger`(`"manual"|"auto"`)와 `pre_tokens`(정수) 뿐이다.
나머지는 전부 `.optional()` 이고 다수가 `@internal` 로 표시돼 있어 CLI 버전이 바뀌면 이름이나 존재
여부가 바뀔 수 있다는 신호로 읽는다. → 파서 `turn.ts` 는 `trigger` 와 `pre_tokens`/`post_tokens` (있으면)
정도만 "여기서 압축됐다, 이런 이유로, 토큰이 이 정도 줄었다" 표시에 쓰고, `@internal` 로 표시된 나머지
필드(`cumulative_dropped_tokens`, `user_context`, `messages_summarized`, `precomputed`,
`pre_compact_discovered_tools`, `preserved_segment`)는 읽지 않는다 — 브리프가 지시한 "필드 없이 사건으로만"
보다는 한 단계 더 확인됐지만, 확인되지 않은 나머지는 여전히 손대지 않는다.

## 확인하지 않은 것

실제 압축을 일으켜서 이 이벤트가 스트림에 실제로 나오는 모습은 보지 않았다(브리프가 비싸다고 명시한
그대로 건너뛰었다). 위 스키마는 바이너리 안 zod 정의에서 읽은 것이고, 실제 트리거 시나리오별로
`post_tokens` 등 선택 필드가 실제로 채워지는지는 다음에 압축이 실제로 걸렸을 때 확인이 필요하다.
