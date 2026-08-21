import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Marketplace, PluginVerb } from '@/entities/plugin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { t } from '@lingui/core/macro'
import { Quietly, Row } from './parts'

export function SourcesTab({
  marketplaces,
  busy,
  onAct,
}: {
  marketplaces: Marketplace[]
  busy: string | null
  onAct(verb: PluginVerb, target: string): void
}) {
  return (
    <>
      {marketplaces.map((market) => (
        <Row
          key={market.name}
          title={market.name}
          note={market.origin ?? market.source}
          busy={busy === market.name}
        >
          <Quietly label={t`Refresh`} onClick={() => onAct('market-update', market.name)} />
          <Quietly
            label={t`Remove`}
            icon={<Trash2 />}
            onClick={() => onAct('market-remove', market.name)}
          />
        </Row>
      ))}
      <AddSource onAdd={(source) => onAct('market-add', source)} />
    </>
  )
}

function AddSource({ onAdd }: { onAdd(source: string): void }) {
  const [source, setSource] = useState('')
  return (
    <form
      className="mt-2 flex items-center gap-2 border-t border-border pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (source.trim().length === 0) return
        onAdd(source.trim())
        setSource('')
      }}
    >
      <Input
        value={source}
        onChange={(event) => setSource(event.target.value)}
        placeholder={t`owner/repo, a URL, or a folder`}
        aria-label={t`Add a marketplace`}
        className="h-8 rounded-lg text-sm"
      />
      <Button type="submit" size="sm" variant="ghost" className="flex-none rounded-lg">
        <Plus />
        {t`Add`}
      </Button>
    </form>
  )
}
