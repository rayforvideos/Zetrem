import type { AgentSession } from '@/entities/agent-session'
import { saidBack } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { stateWord } from '../../lib/state-word/state-word'
import { t } from '@lingui/core/macro'

// The subagents this teammate called in. They never take a tile of their own,
// so what they were called in for, and what they came back with, is read here.
export function HelperList({ helpers }: { helpers: AgentSession[] }) {
  if (helpers.length === 0) return null

  return (
    <div data-helpers className="flex flex-col gap-4 pt-2">
      <span className="text-xs tracking-[0.08em] text-muted-foreground">{t`Their helpers`}</span>
      {helpers.map((helper) => (
        <div key={helper.id} data-helper={helper.id} className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <AgentSprite subagentType={helper.subagentType || helper.label} size={16} />
            <span className="flex-none">{helper.subagentType || helper.label}</span>
            <span className="truncate">{helper.label}</span>
            <span className="ml-auto flex-none">{stateWord(helper.status)}</span>
          </span>
          {/* Until it reports, the headline is still the prompt it was handed,
              which only repeats what the line above already says. */}
          {saidBack(helper) && helper.headline.length > 0 && (
            <Markdown text={helper.headline} className="text-sm leading-relaxed" />
          )}
        </div>
      ))}
    </div>
  )
}
