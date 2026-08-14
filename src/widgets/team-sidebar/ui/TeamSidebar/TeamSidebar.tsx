import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { AgentDefDraft } from '@/entities/agent-def'
import { cn } from '@/shared/lib/cn'
import type { CharacterId } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import type { ChatSummary } from '@/entities/conversation'
import { ChatList } from '../ChatList/ChatList'
import { StockList } from '../StockList/StockList'
import { CharacterPicker } from '../CharacterPicker/CharacterPicker'
import { SidebarGrip } from '../SidebarGrip/SidebarGrip'
import { MemberMenu } from '../MemberMenu/MemberMenu'
import {
  characterFor,
  draftFrom,
  initialCharacter,
} from '../../lib/member-draft/member-draft'
import { Button } from '@/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/ui/empty'
import { Field, FieldDescription, FieldGroup } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { Origin, TeamMember } from '../../lib/team/team.types'

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
  onRelease(name: string): void
  onEdit(draft: AgentDefDraft, previousName: string): void
  drafts: Map<string, AgentDefDraft>
  width: number
  onResize(width: number): void
  onResizeEnd(width: number): void
  chats: ChatSummary[]
  openChatId: string | null
  nowMs: number
  onOpenChat(id: string): void
  onStartChat(): void
  onRemoveChat(id: string): void
  stock: string[]
  stockOn: string[]
  onStock(name: string, on: boolean): void
}

export function TeamSidebar({
  members,
  sessionKnown,
  canWrite,
  note,
  onHire,
  onPick,
  onAddress,
  onRelease,
  onEdit,
  drafts,
  width,
  onResize,
  onResizeEnd,
  chats,
  openChatId,
  nowMs,
  onOpenChat,
  onStartChat,
  onRemoveChat,
  stock,
  stockOn,
  onStock,
}: TeamSidebarProps) {
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const target = typeof editing === 'string' ? (drafts.get(editing) ?? null) : null

  return (
    <aside
      style={{ width }}
      className="zt-bleed relative flex flex-none flex-col overflow-hidden border-r border-border bg-card/40"
    >
      <SidebarGrip width={width} onResize={onResize} onResizeEnd={onResizeEnd} />
      <div className="zt-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto pr-3">
      <ChatList
        chats={chats}
        openId={openChatId}
        nowMs={nowMs}
        onOpen={onOpenChat}
        onStart={onStartChat}
        onRemove={onRemoveChat}
      />

      <div className="mt-2 border-t border-border px-2 pt-4 text-xs tracking-wide text-muted-foreground">
        Your team
      </div>

      {editing !== null ? (
        <MemberForm
          key={editing}
          initial={target}
          onCancel={() => setEditing(null)}
          onSubmit={(draft) => {
            if (target === null) onHire(draft)
            else onEdit(draft, target.name)
            setEditing(null)
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="bare"
          onClick={() => setEditing('new')}
          disabled={!canWrite}
          className="min-w-0 justify-start gap-2.5 rounded-xl bg-card px-2 py-1.5 text-left disabled:pointer-events-auto"
          title={canWrite ? undefined : 'Pick a project first'}
        >
          <span
            className="flex flex-none items-center justify-center rounded-full border border-border text-muted-foreground"
            style={{ width: AVATAR, height: AVATAR }}
          >
            <Plus />
          </span>
          <span className="truncate text-sm font-medium">Add teammate</span>
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
            <div
              key={member.type}
              className="group/member relative flex items-center gap-0.5"
            >
            <Button
              data-member={member.type}
              variant="ghost"
              size="bare"
              onClick={() =>
                member.sessionId !== null ? onPick(member.sessionId) : onAddress(member.type)
              }
              disabled={mute}
              className={cn(
                'min-w-0 flex-1 justify-start gap-2.5 rounded-lg px-2 py-1.5 text-left disabled:pointer-events-auto',
                mute ? 'text-muted-foreground' : 'text-foreground',
                active && 'bg-card',
              )}
              title={
                member.sessionId !== null ? 'See what they did' : mute ? why : 'Give them a task'
              }
            >
              <AgentSprite
                subagentType={member.type}
                chosen={member.character}
                state={member.state}
                size={AVATAR}
              />
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="truncate text-sm leading-tight">{member.name}</span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {state ?? member.description ?? ''}
                </span>
              </span>
            </Button>
            <MemberMenu
              name={member.name}
              onEdit={() => setEditing(member.type)}
              onRelease={() => onRelease(member.type)}
            />
            </div>
          )
        })}
      </div>

      {members.length === 0 && editing === null && (
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

      <div className="mt-2 border-t border-border px-2 pt-4 text-xs tracking-wide text-muted-foreground">
        Claude Code
      </div>
      <StockList stock={stock} on={stockOn} avatar={AVATAR} onChange={onStock} />
      </div>
    </aside>
  )
}

function MemberForm({
  initial = null,
  onSubmit,
  onCancel,
}: {
  initial?: AgentDefDraft | null
  onSubmit(draft: AgentDefDraft): void
  onCancel(): void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [picked, setPicked] = useState<CharacterId | null>(initialCharacter(initial))
  const [missing, setMissing] = useState<string | null>(null)
  const character = characterFor(picked, name)
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
        onSubmit(draftFrom({ name, description, prompt, character }, initial))
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
        <Field>
          <CharacterPicker value={character} onChange={setPicked} />
        </Field>
        <FieldDescription>
          {missing ?? (initial === null ? 'Available from the next session' : 'Applies from the next session')}
        </FieldDescription>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="rounded-full">
          {initial === null ? 'Create' : 'Save'}
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
