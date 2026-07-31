import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { FileUpload, type FileUploadSelectEvent } from 'primereact/fileupload';
import { CharacterCount } from './CharacterCount';
import { MarkdownPreview } from './MarkdownPreview';
import { MentionTextarea, type MentionSuggestion } from './MentionTextarea';
import type { Attachment } from '../../types/domain';

const COMMENT_MAX_LENGTH = 2000;

interface CommentEditorProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  placeholder?: string;
  submitting?: boolean;
  autoFocus?: boolean;
  rows?: number;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  existingAttachments?: Attachment[];
  onUploadAttachment?: (file: File) => void | Promise<void>;
  onRemoveAttachment?: (attachment: Attachment) => void | Promise<void>;
  mentionSuggestions?: MentionSuggestion[];
}

/** Write/Preview editor dari source new, menggunakan kontrak attachment/comment lokal. */
export function CommentEditor({ projectId, value, onChange, onSubmit, onCancel, submitLabel = 'Kirim', placeholder, submitting = false, autoFocus = false, rows = 3, pendingFiles, onPendingFilesChange, existingAttachments, onUploadAttachment, onRemoveAttachment, mentionSuggestions }: CommentEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const uploadRef = useRef<FileUpload>(null);
  const canAttach = !!onPendingFilesChange || !!onUploadAttachment;

  function selectFiles(event: FileUploadSelectEvent) {
    if (onUploadAttachment) event.files.forEach((file) => void onUploadAttachment(file));
    else onPendingFilesChange?.([...(pendingFiles ?? []), ...event.files]);
    uploadRef.current?.clear();
  }

  return (
    <div className="comment-editor-card">
      <div className="comment-editor-tabs">
        <Button label="Tulis" size="small" className="comment-btn-sm" severity="secondary" text={mode !== 'write'} outlined={mode === 'write'} onClick={() => setMode('write')} />
        <Button label="Preview" size="small" className="comment-btn-sm" severity="secondary" text={mode !== 'preview'} outlined={mode === 'preview'} onClick={() => setMode('preview')} />
        {canAttach && <FileUpload ref={uploadRef} mode="basic" chooseLabel="Lampirkan file" chooseOptions={{ className: 'comment-btn-sm p-button-text p-button-secondary' }} customUpload uploadHandler={(event) => event.options.clear()} onSelect={selectFiles} multiple auto={false} />}
      </div>
      <div className="comment-editor-body flex flex-column gap-2">
        {mode === 'write' && !!pendingFiles?.length && <div className="flex flex-wrap gap-1">{pendingFiles.map((file, index) => <span key={`${file.name}-${index}`} className="flex align-items-center gap-1 px-2 py-1 border-round surface-100 text-xs"><i className="pi pi-paperclip" />{file.name}<i className="pi pi-times cursor-pointer" onClick={() => onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== index))} /></span>)}</div>}
        {mode === 'write' ? <MentionTextarea projectId={projectId} value={value} onChange={(nextValue) => onChange(nextValue.slice(0, COMMENT_MAX_LENGTH))} rows={rows} placeholder={placeholder} className="w-full" autoFocus={autoFocus} onSubmitShortcut={() => { if (value.trim() && !submitting) onSubmit(); }} suggestions={mentionSuggestions} /> : <div style={{ minHeight: '4rem' }}><MarkdownPreview value={value} /></div>}
        {!!existingAttachments?.length && <div className="flex flex-wrap gap-1">{existingAttachments.map((attachment) => <span key={attachment.id} className="flex align-items-center gap-1 px-2 py-1 border-round surface-100 text-xs"><a className="entity-link" href={attachment.url ?? '#'} target="_blank" rel="noreferrer">{attachment.fileName}</a>{onRemoveAttachment && <i className="pi pi-times cursor-pointer" onClick={() => void onRemoveAttachment(attachment)} />}</span>)}</div>}
        <div className="flex justify-content-end"><CharacterCount value={value} maxLength={COMMENT_MAX_LENGTH} /></div>
      </div>
      <div className="comment-editor-footer"><Button label={submitLabel} size="small" className="comment-btn-sm" disabled={!value.trim() || submitting} loading={submitting} onClick={onSubmit} />{onCancel ? <Button label="Batal" size="small" className="comment-btn-sm" text severity="secondary" onClick={onCancel} /> : <span />}</div>
    </div>
  );
}
