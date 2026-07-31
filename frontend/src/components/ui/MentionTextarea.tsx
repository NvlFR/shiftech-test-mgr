import { useEffect, useRef, useState } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';

export interface MentionSuggestion {
  id: string;
  code: string;
  label: string;
  sublabel?: string;
}

interface MentionTextareaProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSubmitShortcut?: () => void;
  /** Data suggestion diinjeksikan caller karena repository lokal belum punya searchByProject/search. */
  suggestions?: MentionSuggestion[];
}

type ActiveMention = { start: number; query: string } | null;

function findActiveMention(text: string, caret: number): ActiveMention {
  const match = text.slice(0, caret).match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
  if (!match) return null;
  return { start: caret - match[1].length - 1, query: match[1] };
}

/** Mention UI dari source new tanpa mengasumsikan kontrak search repository yang belum ada. */
export function MentionTextarea({ projectId: _projectId, value, onChange, rows = 2, placeholder, className, autoFocus, onSubmitShortcut, suggestions = [] }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeMention, setActiveMention] = useState<ActiveMention>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = activeMention ? suggestions.filter((item) => `${item.code} ${item.label}`.toLowerCase().includes(activeMention.query.toLowerCase())).slice(0, 5) : [];

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  function handleChange(nextValue: string) {
    onChange(nextValue);
    setActiveMention(findActiveMention(nextValue, textareaRef.current?.selectionStart ?? nextValue.length));
    setActiveIndex(0);
  }

  function applySuggestion(suggestion: MentionSuggestion) {
    if (!activeMention || !textareaRef.current) return;
    const caret = textareaRef.current.selectionStart;
    const inserted = `@${suggestion.code} `;
    const before = value.slice(0, activeMention.start);
    onChange(`${before}${inserted}${value.slice(caret)}`);
    setActiveMention(null);
    requestAnimationFrame(() => {
      const nextCaret = before.length + inserted.length;
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); onSubmitShortcut?.(); return; }
    if (!filtered.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => (index + 1) % filtered.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length); }
    else if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); applySuggestion(filtered[activeIndex]); }
    else if (event.key === 'Escape') setActiveMention(null);
  }

  return (
    <div className="relative">
      <InputTextarea ref={textareaRef} value={value} onChange={(event) => handleChange(event.target.value)} onKeyDown={handleKeyDown} onBlur={() => setTimeout(() => setActiveMention(null), 150)} rows={rows} autoResize placeholder={placeholder} className={className} />
      {!!filtered.length && <ul className="absolute z-5 mt-1 p-0 border-round shadow-2" style={{ listStyle: 'none', minWidth: '14rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
        {filtered.map((suggestion, index) => <li key={suggestion.id} className={`flex align-items-center gap-2 p-2 cursor-pointer ${index === activeIndex ? 'surface-hover' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => applySuggestion(suggestion)}><span className="font-medium text-sm">@{suggestion.code}</span>{suggestion.sublabel && <span className="text-color-secondary text-xs">{suggestion.sublabel}</span>}</li>)}
      </ul>}
    </div>
  );
}
