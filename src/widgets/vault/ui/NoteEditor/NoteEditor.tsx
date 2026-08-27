import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { NoteEditorProps } from './NoteEditor.types'

export function NoteEditor({
  note,
  title,
  onChange,
  onTitle,
  guide,
  fresh,
  meta,
  actions,
}: NoteEditorProps) {
  const [text, setText] = useState(note.text)
  const [named, setNamed] = useState(title)
  const naming = fresh && !guide
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (naming) field.current?.select()
  }, [naming])

  function commit(): void {
    const wanted = named.trim()
    if (wanted.length === 0 || wanted === title) {
      setNamed(title)
      return
    }
    void onTitle(wanted).then((landed) => {
      if (!landed) setNamed(title)
    })
  }

  return (
    <div className="zt-scroll flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-2">
      <div className="sticky top-0 z-[1] flex flex-col gap-1.5 bg-background pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0 flex-1">
            {guide ? (
              <h2 className="h-7 truncate text-base font-semibold leading-7">{note.title}</h2>
            ) : (
              <Input
                ref={field}
                autoFocus={naming}
                value={named}
                aria-label={t`Title`}
                onChange={(event) => setNamed(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commit()
                  }
                  if (event.key === 'Escape') setNamed(title)
                }}
                className="-ml-2 h-7 w-full border-transparent bg-transparent px-2 text-base font-semibold shadow-none dark:bg-transparent"
              />
            )}
            {meta}
          </div>
          {actions}
        </div>
      </div>
      <Textarea
        autoFocus={!naming}
        value={text}
        aria-label={note.title}
        placeholder={t`Write in markdown`}
        onChange={(event) => {
          setText(event.target.value)
          onChange(event.target.value)
        }}
        className="min-h-[60vh] resize-none border-transparent bg-transparent px-0 font-mono text-sm leading-relaxed shadow-none dark:bg-transparent"
      />
    </div>
  )
}
