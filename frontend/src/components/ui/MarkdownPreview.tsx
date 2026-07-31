import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownPreviewProps {
  value: string;
  emptyText?: string;
}

export function MarkdownPreview({ value, emptyText = 'Belum ada yang dipreview.' }: MarkdownPreviewProps) {
  if (!value.trim()) return <p className="m-0 text-color-secondary text-sm italic">{emptyText}</p>;

  return (
    <div className="markdown-preview text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, ...props }) => {
            const external = /^https?:\/\//.test(href ?? '');
            return <a href={href} {...props} className="entity-link" target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} />;
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
