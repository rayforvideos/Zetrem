import { useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/ui/empty'
import { noteLine } from '../../lib/team-note/team-note'
import { FirstHint } from '@/widgets/first-hint'
import { rowStateOf } from '../../lib/row-state/row-state'
import type { Origin, TeamMember } from '../../lib/team/team.types'
import type { TeamListProps } from './TeamList.types'
import { MemberForm } from '../MemberForm/MemberForm'
import { MemberMenu } from '../MemberMenu/MemberMenu'
import { msg, t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import type { MessageDescriptor } from '@lingui/core'

const ORIGIN: Record<Origin, MessageDescriptor> = {
  project: msg`This project`,
  user: msg`Your account`,
  session: msg`Claude Code`,
}

export function TeamList({
  members,
  drafts,
  knownTools,
  sessionKnown,
  read,
  sessionLive,
  canWrite,
  hint,
  note,
  avatar,
  onHire,
  onEdit,
  onRelease,
  onPick,
  onAddress,
  onRestart,
  onHintSeen,
}: TeamListProps) {
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const said = note === null ? null : noteLine(note, sessionLive)
  const target = typeof editing === 'string' ? (drafts.get(editing) ?? null) : null

  return (
    <>
      {editing !== null && (
        <MemberForm
          key={editing}
          initial={target}
          knownTools={knownTools}
          onCancel={() => setEditing(null)}
          onSubmit={(draft) => {
            if (target === null) onHire(draft)
            else onEdit(draft, target.name)
            setEditing(null)
          }}
        />
      )}

      <Button
        variant="ghost"
        size="bare"
        onClick={() => setEditing('new')}
        disabled={!canWrite}
        className="min-w-0 justify-start gap-2.5 rounded-xl bg-card px-2 py-1.5 text-left disabled:pointer-events-auto"
        title={canWrite ? undefined : t`Pick a project first`}
      >
        <span
          className="flex flex-none items-center justify-center rounded-full border border-border text-muted-foreground"
          style={{ width: avatar, height: avatar }}
        >
          <Plus />
        </span>
        <span className="truncate text-sm font-medium">{t`Add teammate`}</span>
      </Button>

      {hint && (
        <FirstHint
          title={t`Add your first teammate`}
          body={t`Write their brief once and the orchestrator can call them from any project.`}
          onClose={onHintSeen}
        />
      )}

      <div className="flex flex-col gap-0.5">
        {members.map((member) => (
          <MemberRow
            read={read}
            key={member.type}
            member={member}
            avatar={avatar}
            sessionKnown={sessionKnown}
            onPick={onPick}
            onAddress={onAddress}
            onEdit={() => setEditing(member.type)}
            onRelease={() => onRelease(member.type)}
          />
        ))}
      </div>

      {members.length === 0 && editing === null && (
        <Empty className="flex-none items-start justify-start gap-2 px-2.5 py-2 text-left md:px-2.5 md:py-2">
          <EmptyHeader className="items-start text-left">
            <EmptyTitle className="text-sm">{t`No one here yet`}</EmptyTitle>
            <EmptyDescription className="text-xs">
              {t`Create a teammate and they'll show up here.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {said !== null && (
        <div data-note className="flex flex-col items-start gap-1.5 px-2 py-1">
          <p className="text-xs leading-snug text-muted-foreground">{said.text}</p>
          {said.restart && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestart}
              className="h-7 rounded-lg border border-border px-2.5 text-xs"
              title={t`Stop the running session so the next message starts one that knows them`}
            >
              <RotateCcw className="size-3.5" />
              {t`Restart session`}
            </Button>
          )}
        </div>
      )}
    </>
  )
}

type MemberRowProps = {
  member: TeamMember
  avatar: number
  sessionKnown: boolean
  read: string[]
  onPick(sessionId: string): void
  onAddress(subagentType: string): void
  onEdit(): void
  onRelease(): void
}

function MemberRow({
  member,
  avatar,
  sessionKnown,
  read,
  onPick,
  onAddress,
  onEdit,
  onRelease,
}: MemberRowProps) {
  const row = rowStateOf(member, read)
  const mute = sessionKnown && !member.callable
  const why = !member.loaded
    ? t`${i18n._(ORIGIN[member.origin])}. Joins from the next session.`
    : t`Not available this session. Unlock it in Settings.`

  return (
    <div className="group/member relative flex items-center gap-0.5">
      <Button
        data-member={member.type}
        variant="ghost"
        size="bare"
        onClick={() => (row.open !== null ? onPick(row.open) : onAddress(member.type))}
        disabled={mute}
        className={cn(
          'min-w-0 flex-1 justify-start gap-2.5 rounded-lg px-2 py-1.5 text-left disabled:pointer-events-auto',
          mute ? 'text-muted-foreground' : 'text-foreground',
          row.lit && 'bg-card',
        )}
        title={row.open !== null ? t`See what they did` : mute ? why : t`Give them a task`}
      >
        <AgentSprite
          subagentType={member.type}
          chosen={member.character}
          state={row.state}
          size={avatar}
        />
        <span className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="flex min-w-0 items-center gap-1.5 text-sm leading-tight">
            <span className="truncate">{member.name}</span>
          </span>
          <span className="truncate text-xs leading-tight text-muted-foreground">
            {row.now ?? member.description ?? ''}
          </span>
        </span>
      </Button>
      <MemberMenu name={member.name} onEdit={onEdit} onRelease={onRelease} />
    </div>
  )
}
