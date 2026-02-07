import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
  className?: string;
}

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Disable img rendering — render as a plain link instead to prevent
  // arbitrary external images from breaking layouts and leaking IPs
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {alt || src || 'image'}
    </a>
  ),
};

export default function MarkdownRenderer({ content, compact = false, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const proseSize = compact ? 'prose-sm' : 'prose-base';

  return (
    <div className={`prose dark:prose-invert max-w-none ${proseSize} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
