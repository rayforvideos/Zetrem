import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { NoteEditorProps } from './NoteEditor.types'

const BARE =
  '-ml-2 h-7 w-full border-transparent bg-transparent px-2 shadow-none dark:bg-transparent'

export function NoteEditor({ note, guide, fresh, onChange, onTitle, onTags }: NoteEditorProps) {
  const [body, setBody] = useState(note.body)
  const [named, setNamed] = useState(note.title)
  const [tagged, setTagged] = useState(note.tags.join(', '))
  const naming = fresh && !guide
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (naming) field.current?.select()
  }, [naming])

  // Enter commits, and the blur that follows would commit the same title
  // again while the first rename is still in flight.
  const committing = useRef<string | null>(null)
  function commitTitle(): void {
    const wanted = named.trim()
    if (wanted.length === 0 || wanted === note.title) {
      setNamed(note.title)
      return
    }
    if (committing.current === wanted) return
    committing.current = wanted
    void onTitle(wanted)
      .then((landed) => {
        if (!landed) setNamed(note.title)
      })
      .finally(() => {
        committing.current = null
      })
  }

  function commitTags(): void {
    const tags = [
      ...new Set(
        tagged
          .split(',')
          .map((one) => one.trim())
          .filter(Boolean),
      ),
    ]
    setTagged(tags.join(', '))
    if (tags.join('\n') !== note.tags.join('\n')) onTags(tags)
  }

  return (
    <div data-note-editor className="flex flex-col gap-1">
      {!guide && (
        <>
          <Input
            ref={field}
            autoFocus={naming}
            value={named}
            aria-label={t`Title`}
            onChange={(event) => setNamed(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitTitle()
              }
              if (event.key === 'Escape') setNamed(note.title)
            }}
            className={`${BARE} text-xl font-semibold tracking-tight md:text-xl`}
          />
          <Input
            data-tags-field
            value={tagged}
            aria-label={t`Tags`}
            placeholder={t`Tags, separated by commas`}
            onChange={(event) => setTagged(event.target.value)}
            onBlur={commitTags}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              commitTags()
            }}
            className={`${BARE} h-6 text-xs text-muted-foreground md:text-xs`}
          />
        </>
      )}
      <Textarea
        autoFocus={!naming}
        value={body}
        aria-label={note.title}
        placeholder={t`Write in markdown`}
        onChange={(event) => {
          setBody(event.target.value)
          onChange(event.target.value)
        }}
        className="mt-2 min-h-[60vh] resize-none border-transparent bg-transparent px-0 text-base leading-7 shadow-none md:text-base dark:bg-transparent"
      />
    </div>
  )
}
