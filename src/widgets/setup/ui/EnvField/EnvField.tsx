import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { canAddEnv, tidyEnvName } from '../../lib/env-list/env-list'
import { Button } from '@/shared/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { t } from '@lingui/core/macro'

// Names, never values. What is typed here is the name of a variable the person
// already has in their shell; Zetrem looks it up when it starts a session. A
// field that took the value instead would put a token in settings.json, in plain
// text, and leave it there long after the token was rotated.
export function EnvField({ names, onChange }: { names: string[]; onChange(next: string[]): void }) {
  const [typed, setTyped] = useState('')
  const name = tidyEnvName(typed)
  const canAdd = canAddEnv(names, name)

  const add = (): void => {
    if (!canAdd) return
    onChange([...names, name])
    setTyped('')
  }

  return (
    <Field>
      <FieldLabel className="text-muted-foreground">{t`Environment variables`}</FieldLabel>
      <div className="flex items-center gap-2.5">
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add()
          }}
          placeholder={t`GITHUB_TOKEN`}
          aria-label={t`Variable name`}
          className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3.5 font-mono"
        />
        <Button
          variant="ghost"
          onClick={add}
          disabled={!canAdd}
          aria-label={t`Add variable`}
          className="h-11 flex-none rounded-xl px-4"
        >
          <Plus />
          {t`Add`}
        </Button>
      </div>
      {names.length > 0 && (
        <ul data-env-list className="flex flex-wrap gap-1.5">
          {names.map((one) => (
            <li key={one}>
              <span className="flex items-center gap-1 rounded-lg bg-card py-1 pr-1 pl-2.5 font-mono text-sm">
                {one}
                <Button
                  variant="ghost"
                  size="bare"
                  onClick={() => onChange(names.filter((each) => each !== one))}
                  aria-label={t`Remove ${one}`}
                  className="size-6 rounded-md text-muted-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <FieldDescription>
        {t`Named variables are carried from the shell Zetrem started in into every session, which is how a connector finds its token. Zetrem keeps the names, never the values.`}
      </FieldDescription>
    </Field>
  )
}
