import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type State = { error: Error | null; stack: string }

// 렌더러가 던지면 창이 하얗게 죽는다. 그러면 쓰는 사람은 "에러난다"고만 말할 수 있고
// 우리는 무엇이 났는지 모른다. 화면에 그대로 적고 콘솔로도 흘려보낸다.
export class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, stack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ stack: info.componentStack ?? '' })
    console.error('[zetrem] 화면이 죽었다', error, info.componentStack)
  }

  render(): ReactNode {
    const { error, stack } = this.state
    if (error === null) return this.props.children

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: '#0a0a0b',
          color: '#ededf0',
          padding: 56,
          overflow: 'auto',
          fontFamily: 'var(--zt-mono, ui-monospace)',
          fontSize: 12.5,
          lineHeight: 1.7,
        }}
      >
        <p style={{ fontSize: 15, marginBottom: 16 }}>화면이 죽었습니다. 무엇이 났는지 적습니다.</p>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error.message}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.45, marginTop: 16 }}>
          {error.stack ?? ''}
          {stack}
        </pre>
      </div>
    )
  }
}
