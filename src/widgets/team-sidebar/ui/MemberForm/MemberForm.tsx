import { useState } from 'react'
import { ChevronDown, FileText, Paperclip, X } from 'lucide-react'
import { addReading, readingPath } from '@/entities/agent-def'
import type { AgentDefDraft } from '@/entities/agent-def'
import { MODELS } from '@/entities/settings'
import type { CharacterId } from '@/entities/teammate'
import { AgentSprite } from '@/entities/teammate/ui/AgentSprite/AgentSprite'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'
import {
  characterFor,
  draftFrom,
  initialCharacter,
  toggled,
  toolSummary,
} from '../../lib/member-draft/member-draft'
import { writes } from '../../lib/writes/writes'
import { CharacterPicker } from '../CharacterPicker/CharacterPicker'
import { ToolPicker } from '../ToolPicker/ToolPicker'
import { useScrollState } from '@/shared/lib/scroll-state/useScrollState'
import { t } from '@lingui/core/macro'
import { read } from '@/shared/lib/say/read'

const INHERIT = 'inherit'
const AVATAR = 32

type MemberFormProps = {
  initial: AgentDefDraft | null
  knownTools: string[]
  onSubmit(draft: AgentDefDraft): void
  onCancel(): void
}

export function MemberForm({ initial, knownTools, onSubmit, onCancel }: MemberFormProps) {
  const [side] = useScrollState<HTMLElement>()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [model, setModel] = useState(initial?.model ?? null)
  const [tools, setTools] = useState(initial?.tools ?? [])
  const [knowledge, setKnowledge] = useState(initial?.knowledge ?? [])
  const [worktree, setWorktree] = useState(initial?.worktree ?? true)
  const [picked, setPicked] = useState<CharacterId | null>(initialCharacter(initial))
  const [missing, setMissing] = useState<string | null>(null)
  const [sheet, setSheet] = useState<HTMLElement | null>(null)
  const character = characterFor(picked)

  const lack =
    name.trim().length === 0
      ? t`Give them a name`
      : prompt.trim().length === 0
        ? t`Write what they do, and how`
        : null

  const [over, setOver] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const [trouble, setTrouble] = useState<string | null>(null)

  function attach(): void {
    void window.desk
      .pickKnowledge()
      .then((picks) => {
        setKnowledge((held) => addReading(held, picks))
        setTrouble(null)
      })
      .catch(() => setTrouble(t`Could not open the file picker`))
  }

  function take(files: File[]): void {
    void Promise.all(files.map((file) => window.desk.pathForFile(file)))
      .then((paths) => {
        const next = addReading(knowledge, paths)
        const turned = paths.filter((path) => !next.includes(path))
        setKnowledge(next)
        setRefused(turned.length === 0 ? null : readingPath(turned[0]!).name)
      })
      // pathForFile crosses to main and back, so it can fail like any invoke.
      .catch(() => setTrouble(t`Could not read what you attached`))
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        ref={setSheet}
        showCloseButton={false}
        className="h-[min(84vh,720px)] max-w-[min(92vw,900px)] gap-0 overflow-hidden p-0 sm:max-w-[min(92vw,900px)]"
      >
        <form
          className="flex h-full min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (lack !== null) {
              setMissing(lack)
              return
            }
            onSubmit(
              draftFrom(
                { name, description, prompt, character, model, tools, knowledge, worktree },
                initial,
              ),
            )
          }}
        >
          <DialogHeader className="flex-none flex-row items-center gap-3 border-b border-border px-6 py-4 text-left">
            <AgentSprite subagentType={name} chosen={character} state="idle" size={AVATAR} />
            <span className="flex min-w-0 flex-col">
              <DialogTitle className="truncate text-base">
                {initial === null ? t`New teammate` : t`Edit ${initial.name}`}
              </DialogTitle>
              <DialogDescription>
                {t`This is everything they know when they start.`}
              </DialogDescription>
            </span>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <aside
              ref={side}
              className="zt-scroll zt-fade-y flex w-[264px] flex-none flex-col gap-4 overflow-y-auto border-r border-border px-5 py-5"
            >
              <Row label={t`Name`} htmlFor="member-name">
                <Input
                  id="member-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t`A name to call them by`}
                  aria-invalid={missing !== null && name.trim().length === 0}
                  autoFocus
                />
              </Row>

              <Row label={t`When to call them`} htmlFor="member-description">
                <Input
                  id="member-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t`The kind of work they should get`}
                />
                <Note>{t`The orchestrator reads this to pick who gets the job.`}</Note>
              </Row>

              <Row label={t`Face`}>
                <CharacterPicker value={character} onChange={setPicked} />
              </Row>

              <Row label={t`Model`} htmlFor="member-model">
                <Select
                  value={model ?? INHERIT}
                  onValueChange={(next) => setModel(next === INHERIT ? null : next)}
                >
                  <SelectTrigger id="member-model" className="w-full">
                    <SelectValue placeholder={t`Same as the session`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INHERIT}>{t`Same as the session`}</SelectItem>
                    {MODELS.filter((choice) => choice.id !== 'default').map((choice) => (
                      <SelectItem key={choice.id} value={choice.id}>
                        {read(choice.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>

              <Row label={t`Tools`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">{toolSummary(tools, knownTools)}</span>
                      <ChevronDown className="size-4 flex-none text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    container={sheet}
                    collisionBoundary={sheet}
                    align="start"
                    side="right"
                    collisionPadding={16}
                    className="w-[min(360px,90vw)] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0"
                  >
                    <ToolPicker
                      known={knownTools}
                      chosen={tools}
                      onToggle={(tool, on) => setTools(toggled(tools, tool, on))}
                      onClear={() => setTools([])}
                    />
                  </PopoverContent>
                </Popover>
              </Row>

              <Row label={t`Own workspace`} htmlFor="member-worktree">
                <span className="flex items-center gap-2">
                  <Switch id="member-worktree" checked={worktree} onCheckedChange={setWorktree} />
                </span>
                <Note>{t`Works in a git worktree of its own; changes come back as a branch.`}</Note>
                {!worktree && writes(tools) && (
                  <p data-shared-warning className="text-xs leading-snug text-muted-foreground">
                    {t`Writes straight into the shared working tree.`}
                  </p>
                )}
              </Row>
            </aside>

            {/* biome-ignore lint/a11y/noStaticElementInteractions: a drop target is not something you press, and there is no keyboard gesture to hand it */}
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-6 py-5"
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setOver(true)
                setRefused(null)
                setTrouble(null)
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                setOver(false)
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setOver(false)
                take([...event.dataTransfer.files])
              }}
            >
              <div className="flex min-h-0 flex-[3] flex-col gap-2">
                <Label htmlFor="member-prompt">{t`Their instructions`}</Label>
                <Textarea
                  id="member-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={t`What they do, how to go about it, and what to hand back.`}
                  aria-invalid={missing !== null && prompt.trim().length === 0}
                  className="zt-scroll min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed"
                />
                <Note>{t`This always applies. Write it the way you would explain the job to a person.`}</Note>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    {t`Reading list`}
                    {knowledge.length > 0 && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {knowledge.length}
                      </span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={attach}
                    className="h-7 text-muted-foreground"
                  >
                    <Paperclip className="size-3.5" />
                    {t`Attach`}
                  </Button>
                </div>
                {knowledge.length === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    data-dropzone
                    data-over={over || undefined}
                    onClick={attach}
                    className={cn(
                      'h-auto min-h-0 flex-1 rounded-xl border border-dashed border-border text-xs font-normal text-muted-foreground transition-colors hover:bg-card',
                      over && 'border-foreground/40 bg-card',
                    )}
                  >
                    {t`Drop a document here, or click to pick one.`}
                  </Button>
                ) : (
                  <div
                    data-over={over || undefined}
                    className={cn(
                      'zt-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-xl border border-dashed border-transparent p-1 pr-2.5 transition-colors',
                      over && 'border-border bg-card/40',
                    )}
                  >
                    {knowledge.map((path) => {
                      const entry = readingPath(path)
                      return (
                        <div
                          key={path}
                          title={path}
                          className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5"
                        >
                          <FileText className="size-3.5 flex-none text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {entry.name}
                            {entry.where.length > 0 && (
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {entry.where}
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t`Remove ${entry.name}`}
                            onClick={() =>
                              setKnowledge((held) => held.filter((one) => one !== path))
                            }
                            className="rounded-md text-muted-foreground"
                          >
                            <X />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Note>
                  {trouble ??
                    (refused === null
                      ? t`Documents they read first. Long ones cost nothing until they open them.`
                      : t`${refused} is not something they can read. Notes and data files only.`)}
                </Note>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-none border-t border-border px-6 py-4 sm:justify-between">
            <span
              role={missing === null ? undefined : 'alert'}
              className={cn(
                'text-xs',
                missing === null ? 'text-muted-foreground' : 'text-destructive',
              )}
            >
              {missing ??
                (initial === null
                  ? t`A running session cannot call them. Restart it, or they join the next one.`
                  : t`A running session keeps the old brief until it is restarted`)}
            </span>
            <span className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} className="rounded-full">
                {t`Cancel`}
              </Button>
              <Button type="submit" className="rounded-full">
                {initial === null ? t`Create` : t`Save`}
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-snug text-muted-foreground">{children}</p>
}
