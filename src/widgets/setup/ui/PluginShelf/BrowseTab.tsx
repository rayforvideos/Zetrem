import { useState } from 'react'
import { Search } from 'lucide-react'
import { browsable } from '@/entities/plugin'
import type { AvailablePlugin } from '@/entities/plugin'
import { Input } from '@/shared/ui/input'
import { t } from '@lingui/core/macro'
import { Quiet, Quietly, Row } from './parts'

export function BrowseTab({
  available,
  held,
  busy,
  loading,
  onInstall,
}: {
  available: AvailablePlugin[]
  held: Set<string>
  busy: string | null
  loading: boolean
  onInstall(id: string): void
}) {
  const [query, setQuery] = useState('')
  const needle = query.trim()
  const pool = available.filter((plugin) => !held.has(plugin.id))
  const hits = browsable(available, held, query)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-card px-3">
        <Search className="size-4 flex-none text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t`Search ${pool.length} plugins`}
          aria-label={t`Search plugins`}
          autoFocus
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {loading && <Quiet>{t`Reading the catalog…`}</Quiet>}
      {!loading && hits.length === 0 && needle.length > 0 && (
        <Quiet>{t`Nothing matches “${needle}”.`}</Quiet>
      )}
      {!loading && pool.length === 0 && needle.length === 0 && (
        <Quiet>{t`Nothing left to add. Every plugin your sources offer is installed.`}</Quiet>
      )}

      <div className="-mx-2 flex flex-col gap-0.5 rounded-xl bg-card/50 px-2 py-1.5 empty:hidden">
        {hits.map((plugin) => (
          <Row
            key={plugin.id}
            title={plugin.name}
            note={plugin.description}
            busy={busy === plugin.id}
            tall
          >
            <Quietly label={t`Install`} onClick={() => onInstall(plugin.id)} />
          </Row>
        ))}
      </div>
    </div>
  )
}
