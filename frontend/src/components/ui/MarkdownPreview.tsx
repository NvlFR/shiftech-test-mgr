export function MarkdownPreview({ value, emptyText = 'Belum ada yang dipreview.' }: { value: string; emptyText?: string }) {
  if (!value.trim()) return <p className="m-0 text-color-secondary text-sm italic">{emptyText}</p>;
  return <div className="markdown-preview text-sm" style={{ whiteSpace: 'pre-wrap' }}>{value}</div>;
}
