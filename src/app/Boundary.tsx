import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type State = { error: Error | null; stack: string }

export class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, stack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ stack: info.componentStack ?? '' })
    console.error('[zetrem] the screen crashed', error, info.componentStack)
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
          background: '#000000',
          color: '#ededf0',
          padding: 56,
          overflow: 'auto',
          fontFamily: 'var(--zt-mono, ui-monospace)',
          fontSize: 12.5,
          lineHeight: 1.7,
        }}
      >
        <p style={{ fontSize: 15, marginBottom: 16 }}>Something broke. Here is what happened.</p>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error.message}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.45, marginTop: 16 }}>
          {error.stack ?? ''}
          {stack}
        </pre>
      </div>
    )
  }
}
