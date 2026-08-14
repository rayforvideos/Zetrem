import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'

const COMMON = {
  width: 12,
  height: 12,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style: { flex: 'none', opacity: 0.75 },
  'aria-hidden': true,
}

export function ToolIcon({ shape }: { shape: ToolShape }) {
  switch (shape.kind) {
    case 'file':
      return (
        <svg {...COMMON}>
          <path d="M4 2h5l3 3v9H4z" />
          {shape.verb === 'read' && <path d="M6 8h4M6 10.5h2.5" />}
          {shape.verb === 'write' && <path d="M8 7.5v4M6 9.5h4" />}
          {shape.verb === 'edit' && <path d="M6.5 11l1-2.5 3-3 1.5 1.5-3 3z" />}
        </svg>
      )
    case 'command':
      return (
        <svg {...COMMON}>
          <path d="M2.5 3.5h11v9h-11z" />
          <path d="M5 7l1.8 1.5L5 10M8.8 10.2h2.6" />
        </svg>
      )
    case 'search':
      return (
        <svg {...COMMON}>
          <circle cx="7" cy="7" r="4" />
          <path d="M10 10l3.2 3.2" />
        </svg>
      )
    case 'web':
      return (
        <svg {...COMMON}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c1.6 1.7 1.6 9.3 0 11M8 2.5c-1.6 1.7-1.6 9.3 0 11" />
        </svg>
      )
    case 'todo':
      return (
        <svg {...COMMON}>
          <path d="M3 5l1.4 1.4L7 3.8M3 11l1.4 1.4L7 9.8M9.5 5.2h4M9.5 11.2h4" />
        </svg>
      )
    case 'agent':
      return (
        <svg {...COMMON}>
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M3.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
        </svg>
      )
    case 'plain':
      return (
        <svg {...COMMON}>
          <path d="M8 2.2l5 2.9v5.8L8 13.8 3 10.9V5.1z" />
          <circle cx="8" cy="8" r="1.6" />
        </svg>
      )
  }
}
