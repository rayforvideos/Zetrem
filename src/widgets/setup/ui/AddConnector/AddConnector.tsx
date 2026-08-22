import { useState } from 'react'
import { Plus } from 'lucide-react'
import { refusalOf, refusalWhy } from '@/entities/connector'
import type { NewConnector } from '@/entities/connector'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { t } from '@lingui/core/macro'

export function AddConnector({
  taken,
  busy,
  onAdd,
  onImport,
}: {
  taken: string[]
  busy: boolean
  onAdd(draft: NewConnector): Promise<boolean>
  onImport(): void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const refused = refusalOf({ name, url }, taken)
  const showing = touched ? refused : null

  return (
    <div data-add-connector className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onImport}
          className="rounded-lg"
        >
          <Plus />
          {t`Import from Claude Desktop`}
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="bare"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="zt-hit text-xs"
        >
          {open ? t`Never mind` : t`Add one by address`}
        </Button>
      </div>

      {open && (
        <form
          data-add-form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (refused !== null || busy) return
            void onAdd({ name, url }).then((added) => {
              if (!added) return
              setName('')
              setUrl('')
              setTouched(false)
              setOpen(false)
            })
          }}
        >
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t`A short name for it`}
              aria-label={t`Connector name`}
              aria-invalid={showing?.field === 'name'}
              className="h-8 w-40 flex-none rounded-lg text-sm"
              autoFocus
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/mcp"
              aria-label={t`Connector address`}
              aria-invalid={showing?.field === 'url'}
              className="h-8 rounded-lg text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={busy}
              className="flex-none rounded-lg"
            >
              {t`Add`}
            </Button>
          </div>
          <span data-refusal className="text-xs text-muted-foreground">
            {(showing === null ? null : refusalWhy(showing.code)) ?? t`Letters, numbers, hyphens. Sign in after adding if it asks.`}
          </span>
        </form>
      )}
    </div>
  )
}
