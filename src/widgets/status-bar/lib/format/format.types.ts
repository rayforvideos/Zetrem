export type Gauge = {
  key: 'chat' | 'mcp' | 'update'
  label: string
  value: string
  percent: number | null
  warn: boolean
  hint: string | null
}

export type Wired = { connected: number; needsAuth: number; total: number }
