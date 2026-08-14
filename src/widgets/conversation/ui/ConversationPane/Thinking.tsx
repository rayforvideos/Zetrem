import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible'
import { Markdown } from '../Markdown'

export function Thinking({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const paragraphs = text.split('\n\n').length
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="self-start rounded-full font-mono tracking-wide text-muted-foreground"
        >
          Thought · {paragraphs} paragraphs
          <ChevronDown data-icon="inline-end" className={cn(open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Markdown text={text} className="text-sm leading-[1.6] italic text-muted-foreground" />
      </CollapsibleContent>
    </Collapsible>
  )
}
