import { useState } from 'react'
import { Plus } from 'lucide-react'
import { personaOf } from '@/entities/agent-session'
import type { AgentDefDraft } from '@/entities/agent-def'
import { cn } from '@/shared/lib/cn'
import { AgentFace } from '@/shared/ui/agent-face'
import { Button } from '@/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/ui/empty'
import { Field, FieldDescription, FieldGroup } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { Origin, TeamMember } from '../lib/team'

const ORIGIN: Record<Origin, string> = {
  project: 'This project',
  user: 'Your account',
  session: 'Claude Code',
}

const STATE: Record<TeamMember['state'], string | null> = {
  waiting: 'Waiting on you',
  working: null,
  done: 'Reported back',
  idle: null,
}

const AVATAR = 24

type TeamSidebarProps = {
  members: TeamMember[]
  sessionKnown: boolean
  canWrite: boolean
  note: string | null
  onHire(draft: AgentDefDraft): void
  onPick(sessionId: string): void
  onAddress(subagentType: string): void
}

export function TeamSidebar({
  members,
  sessionKnown,
  canWrite,
  note,
  onHire,
  onPick,
  onAddress,
}: TeamSidebarProps) {
  const [hiring, setHiring] = useState(false)

  return (
    <aside className="zt-scroll zt-bleed flex w-[232px] flex-none flex-col gap-3 overflow-y-auto border-r border-border bg-card/40 pr-4">
      <div className="px-2.5 text-xs tracking-[0.08em] text-muted-foreground">Your team</div>

      {hiring ? (
        <HireForm
          onCancel={() => setHiring(false)}
          onSubmit={(draft) => {
            onHire(draft)
            setHiring(false)
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="bare"
          onClick={() => setHiring(true)}
          disabled={!canWrite}
          className="min-w-0 justify-start gap-2.5 rounded-xl bg-card px-2.5 py-2 text-left disabled:pointer-events-auto"
          title={canWrite ? undefined : 'Pick a project first'}
        >
          <span
            className="flex flex-none items-center justify-center rounded-full border border-border text-muted-foreground"
            style={{ width: AVATAR, height: AVATAR }}
          >
            <Plus />
          </span>
          <span className="truncate text-sm font-medium">Create new</span>
        </Button>
      )}

      <div className="flex flex-col gap-0.5">
        {members.map((member) => {
          const state = STATE[member.state] ?? member.note
          const mute = sessionKnown && !member.callable
          const active = member.state !== 'idle'
          const why = !member.loaded
            ? `${ORIGIN[member.origin]} — joins from the next session`
            : 'Not available this session — unlock it in Settings'
          return (
            <Button
              key={member.type}
              data-member={member.type}
              variant="ghost"
              size="bare"
              onClick={() =>
                member.sessionId !== null ? onPick(member.sessionId) : onAddress(member.type)
              }
              disabled={mute}
              className={cn(
                'min-w-0 justify-start gap-2.5 rounded-xl px-2.5 py-2 text-left disabled:pointer-events-auto',
                mute ? 'text-muted-foreground' : 'text-foreground',
                active && 'bg-card',
              )}
              title={
                member.sessionId !== null ? 'See what they did' : mute ? why : 'Give them a task'
              }
            >
              <AgentFace persona={personaOf(member.type)} size={AVATAR} />
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm leading-tight">{member.name}</span>
                  {member.model !== null && (
                    <span className="flex-none font-mono text-xs text-muted-foreground">
                      {member.model}
                    </span>
                  )}
                </span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {state ?? member.description ?? ''}
                </span>
              </span>
            </Button>
          )
        })}
      </div>

      {members.length === 0 && !hiring && (
        <Empty className="flex-none items-start justify-start gap-2 px-2.5 py-2 text-left md:px-2.5 md:py-2">
          <EmptyHeader className="items-start text-left">
            <EmptyTitle className="text-sm">No one here yet</EmptyTitle>
            <EmptyDescription className="text-xs">
              Create a teammate and they'll show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {note !== null && (
        <p data-note className="px-2.5 text-xs leading-snug text-muted-foreground">
          {note}
        </p>
      )}
    </aside>
  )
}

function HireForm({
  onSubmit,
  onCancel,
}: {
  onSubmit(draft: AgentDefDraft): void
  onCancel(): void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [missing, setMissing] = useState<string | null>(null)
  const lack =
    name.trim().length === 0
      ? 'Give them a name'
      : prompt.trim().length === 0
        ? 'Describe what they do'
        : null

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-card p-2.5"
      onSubmit={(event) => {
        event.preventDefault()
        if (lack !== null) {
          setMissing(lack)
          return
        }
        onSubmit({
          name: name.trim(),
          description: description.trim(),
          model: null,
          tools: [],
          prompt: prompt.trim(),
        })
      }}
    >
      <FieldGroup className="gap-2.5">
        <Field data-invalid={missing !== null && name.trim().length === 0 ? true : undefined}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Name"
            aria-invalid={missing !== null && name.trim().length === 0}
            className="h-8 rounded-lg text-sm"
          />
        </Field>
        <Field>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="When to call them"
            aria-label="When to call them"
            className="h-8 rounded-lg text-sm"
          />
        </Field>
        <Field data-invalid={missing !== null && prompt.trim().length === 0 ? true : undefined}>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="What they do, and how"
            aria-label="What they do, and how"
            aria-invalid={missing !== null && prompt.trim().length === 0}
            rows={4}
            className="resize-none rounded-lg text-sm"
          />
        </Field>
        <FieldDescription>{missing ?? 'Available from the next session'}</FieldDescription>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="rounded-full">
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="rounded-full text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
