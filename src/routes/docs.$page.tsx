import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { docQueryOptions } from '@/lib/queries/docs'

const DocsPage = () => {
  const { page } = Route.useParams()
  const { data } = useSuspenseQuery(docQueryOptions(page))
  if (!data) throw notFound()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-4xl font-bold mb-6 text-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-medium mt-6 mb-3 text-foreground">{children}</h3>,
            h4: ({ children }) => <h4 className="text-lg font-medium mt-4 mb-2 text-foreground">{children}</h4>,
            p: ({ children }) => <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-muted-foreground">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-muted-foreground">{children}</ol>,
            li: ({ children }) => <li className="mb-2">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} className="text-primary hover:underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {children}
              </a>
            ),
            hr: () => <hr className="my-8 border-border" />,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground">{children}</blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{children}</code>
            ),
          }}
        >
          {data.markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/docs/$page')({
  loader: async ({ params, context: { queryClient } }) => {
    const data = await queryClient.ensureQueryData(docQueryOptions(params.page))
    if (!data) throw notFound()
  },
  head: ({ loaderData }) => ({
    meta: [{ title: (loaderData as { title?: string } | undefined)?.title }],
  }),
  component: DocsPage,
})
