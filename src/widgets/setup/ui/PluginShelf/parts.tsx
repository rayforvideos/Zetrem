import { Blocks, Building2, FolderClosed, User } from 'lucide-react'
import { ClaudeMark } from '@/shared/graphics/ClaudeMark/ClaudeMark'
import type { PluginGroupKey } from '@/entities/plugin'
import type { ConnectorOrigin } from '@/entities/connector'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { i18n } from '@lingui/core'
import type { MessageDescriptor } from '@lingui/core'

type GroupKind = PluginGroupKey | ConnectorOrigin

const GROUP_MARK: Record<GroupKind, React.ReactNode> = {
  yours: <User />,
  project: <FolderClosed />,
  organisation: <Building2 />,
  account: <ClaudeMark size={13} />,
  plugin: <Blocks />,
}

export function Group({
  kind,
  title,
  note,
  titled,
  children,
}: {
  kind: GroupKind
  title: MessageDescriptor
  note: MessageDescriptor | null
  titled: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      {titled && <GroupName kind={kind} title={title} note={note} />}
      <div className="-mx-2 flex flex-col gap-0.5 rounded-xl bg-card/50 px-2 py-1.5">
        {children}
      </div>
    </section>
  )
}

function GroupName({
  kind,
  title,
  note,
}: {
  kind: GroupKind
  title: MessageDescriptor
  note: MessageDescriptor | null
}) {
  return (
    <div className="flex flex-col gap-0.5 px-2">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-foreground/80">
        <span className="flex-none text-muted-foreground [&_svg]:size-3.5">{GROUP_MARK[kind]}</span>
        {i18n._(title)}
      </span>
      {note !== null && (
        <span className="pl-[22px] text-xs leading-snug text-muted-foreground/70">
          {i18n._(note)}
        </span>
      )}
    </div>
  )
}

export function Slot({ width, children }: { width: string; children: React.ReactNode }) {
  return <span className={cn('flex flex-none items-center justify-center', width)}>{children}</span>
}

export function Row({
  title,
  note,
  busy,
  mark = null,
  dim = false,
  tall = false,
  children,
}: {
  title: string
  note: string
  busy: boolean
  mark?: React.ReactNode
  dim?: boolean
  tall?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg px-2 py-2', dim && 'text-muted-foreground')}
    >
      {mark}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm leading-tight">{title}</span>
        {note.length > 0 && (
          <span
            className={cn(
              'text-xs leading-snug text-muted-foreground',
              tall ? 'line-clamp-2' : 'truncate',
            )}
          >
            {note}
          </span>
        )}
      </span>
      <span className="flex flex-none items-center gap-1">
        {busy ? <Spinner className="size-4 text-muted-foreground" /> : children}
      </span>
    </div>
  )
}

export function Quietly({
  label,
  icon,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  onClick(): void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
    >
      {icon ?? label}
    </Button>
  )
}

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-xs text-muted-foreground">{children}</p>
}
