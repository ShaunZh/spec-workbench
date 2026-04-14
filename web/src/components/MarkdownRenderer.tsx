import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return <code className={className}>{children}</code>
          }
          return <code className="bg-[#2a2a3e] px-1 py-0.5 rounded text-[#7c6ff7]">{children}</code>
        },
        pre: ({ children }) => (
          <pre className="bg-[#2a2a3e] p-3 rounded-lg overflow-x-auto my-2 text-sm">{children}</pre>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-[#7c6ff7] underline hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#7c6ff7] pl-3 my-2 text-[#888]">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
