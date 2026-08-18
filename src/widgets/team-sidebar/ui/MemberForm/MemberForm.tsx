import { useState } from 'react'
import { ChevronDown, FileText, Paperclip, X } from 'lucide-react'
import type { AgentDefDraft } from '@/entities/agent-def'
import { MODELS } from '@/entities/agent-session'
import type { CharacterId } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
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
import { Textarea } from '@/shared/ui/textarea'
import { characterFor, draftFrom, initialCharacter, toggled, toolSummary } from '../../lib/member-draft/member-draft'
import { CharacterPicker } from '../CharacterPicker/CharacterPicker'
import { ToolPicker } from '../ToolPicker/ToolPicker'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
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
  const [settledName, setSettledName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [model, setModel] = useState(initial?.model ?? null)
  const [tools, setTools] = useState(initial?.tools ?? [])
  const [knowledge, setKnowledge] = useState(initial?.knowledge ?? [])
  const [picked, setPicked] = useState<CharacterId | null>(initialCharacter(initial))
  const [missing, setMissing] = useState<string | null>(null)
  const [sheet, setSheet] = useState<HTMLElement | null>(null)
  const character = characterFor(picked, settledName)

  const lack =
    name.trim().length === 0
      ? t`Give them a name`
      : prompt.trim().length === 0
        ? t`Write what they do, and how`
        : null

  function attach(): void {
    void window.desk
      .pickKnowledge()
      .then((picks) => {
        if (picks.length === 0) return
        setKnowledge((held) => [...held, ...picks.filter((path) => !held.includes(path))])
      })
      .catch(() => undefined)
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
              draftFrom({ name, description, prompt, character, model, tools, knowledge }, initial),
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
                {t`What you write here is the whole of what they know when they start.`}
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
                  onBlur={(event) => setSettledName(event.target.value)}
                  placeholder="Siena"
                  aria-invalid={missing !== null && name.trim().length === 0}
                  autoFocus
                />
              </Row>

              <Row label={t`When to call them`} htmlFor="member-description">
                <Input
                  id="member-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t`Reviews the front end`}
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
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-6 py-5">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <Label htmlFor="member-prompt">{t`Their brief`}</Label>
                <Textarea
                  id="member-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    t`You take the front end. Read the markup before you judge the styles.` +
                    '\n\n' +
                    t`Say what you would change and why, in that order.`
                  }
                  aria-invalid={missing !== null && prompt.trim().length === 0}
                  className="zt-scroll min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed"
                />
                <Note>{t`Standing instructions. Write it the way you would brief a person.`}</Note>
              </div>

              <div className="flex flex-none flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t`Reading`}</Label>
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
                  <Note>
                    {t`Documents they are told to read first. Long ones cost nothing until they open them.`}
                  </Note>
                ) : (
                  <div className="zt-scroll flex max-h-28 flex-col gap-1 overflow-y-auto pr-2.5">
                    {knowledge.map((path) => (
                      <div
                        key={path}
                        className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs"
                      >
                        <FileText className="size-3.5 flex-none text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-mono">{path}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${path}`}
                          onClick={() =>
                            setKnowledge((held) => held.filter((entry) => entry !== path))
                          }
                          className="rounded-md text-muted-foreground"
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-none border-t border-border px-6 py-4 sm:justify-between">
            <span className="text-xs text-muted-foreground">
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
