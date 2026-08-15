import { Highlight, themes } from 'prism-react-renderer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/shared/lib/cn'
import { Separator } from '@/shared/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('zt-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-6 mb-2 text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-6 mb-2 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="mt-5 mb-1.5 text-base font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p className="my-3.5 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-3.5 flex flex-col gap-1.5 pl-1 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:top-[0.62em] [&>li]:before:left-[3px] [&>li]:before:size-[3px] [&>li]:before:rounded-full [&>li]:before:bg-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3.5 flex list-decimal flex-col gap-1.5 pl-5 [&>li]:pl-1">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3.5 border-l border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <Separator className="my-4" />,
          table: ({ children }) => <Table className="my-3 text-sm">{children}</Table>,
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => <TableHead>{children}</TableHead>,
          td: ({ children }) => <TableCell className="align-top">{children}</TableCell>,
          code: ({ className: lang, children }) => {
            const match = /language-(\w+)/.exec(lang ?? '')
            const source = String(children).replace(/\n$/, '')
            if (!match) {
              return (
                <code className="rounded-md bg-card px-1.5 py-0.5 font-mono text-[0.88em]">
                  {children}
                </code>
              )
            }
            return <CodeBlock code={source} language={match[1]!} />
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <Highlight theme={themes.vsDark} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="zt-scroll my-3 overflow-x-auto rounded-xl bg-card p-3 font-mono text-sm leading-[1.6]">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}
