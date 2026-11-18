import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/cn'

/**
 * Sanitize allowlist. Raw HTML is never rendered by react-markdown, and this
 * schema additionally strips dangerous protocols/attributes from Markdown
 * output. Widening this list is a security decision, not a styling one.
 */
const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    a: [...(defaultSchema.attributes?.a ?? []), 'rel', 'target'],
  },
}

export function MarkdownContent({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  return (
    <div className={cn('prose-arcade break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={href}
            >
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => (
            <img {...props} src={src} alt={alt ?? ''} loading="lazy" />
          ),
          table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
            <div className="overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
