import { Highlight, themes } from 'prism-react-renderer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/shared/lib/cn'

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('zt-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-5 mb-2 text-[16px] font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-5 mb-2 text-[16px] font-semibold">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[15px] font-semibold opacity-100">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 flex flex-col gap-1 pl-1 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:top-[0.62em] [&>li]:before:left-[3px] [&>li]:before:size-[3px] [&>li]:before:rounded-full [&>li]:before:bg-current [&>li]:before:opacity-45">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 flex list-decimal flex-col gap-1 pl-5 [&>li]:pl-1">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic opacity-100">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l border-current/15 pl-3 opacity-70">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-current/15" />,
          table: ({ children }) => (
            <div className="zt-scroll my-3 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-current/15 px-2 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-current/15 px-2 py-1.5 align-top">{children}</td>
          ),
          code: ({ className: lang, children }) => {
            const match = /language-(\w+)/.exec(lang ?? '')
            const source = String(children).replace(/\n$/, '')
            if (!match) {
              return (
                <code className="rounded-none bg-current/8 px-1 py-px font-mono text-[0.88em]">
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
        <pre className="zt-scroll my-3 overflow-x-auto border-l border-current/15 bg-current/[0.04] py-2.5 pr-3 pl-3 font-mono text-[12.5px] leading-[1.6]">
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
