import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { attachmentService } from '../../services/attachmentService';
import { useAttachments } from '../../hooks/useAttachments';
import { useAuthContext } from '../../hooks/useAuth';
import type { Attachment, AttachmentEntityKind } from '../../types/domain';

interface AttachmentPanelProps {
  kind: AttachmentEntityKind;
  entityId: string;
  canUpload: boolean;
  canDelete: boolean;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({ kind, entityId, canUpload, canDelete }: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useRef<Toast>(null);
  const { profile } = useAuthContext();
  const { attachments, loading, reload } = useAttachments(kind, entityId);
  const [uploading, setUploading] = useState(false);

  async function handleSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile) return;
    setUploading(true);
    try {
      await attachmentService.upload(kind, entityId, file, profile.id);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Attachment berhasil diupload' });
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Upload attachment gagal', detail: error instanceof Error ? error.message : undefined });
    } finally {
      setUploading(false);
    }
  }

  function remove(attachment: Attachment) {
    confirmDialog({
      header: 'Hapus Attachment',
      message: `File "${attachment.fileName}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await attachmentService.remove(attachment);
          await reload();
          toast.current?.show({ severity: 'success', summary: 'Attachment dihapus' });
        } catch (error) {
          toast.current?.show({ severity: 'error', summary: 'Gagal menghapus attachment', detail: error instanceof Error ? error.message : undefined });
        }
      },
    });
  }

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Card title={`Attachment (${attachments.length})`} className="mb-3">
        <div className="flex justify-content-between align-items-center gap-2 mb-3">
          <span className="text-color-secondary text-sm">File private, maksimal 10 MB per file.</span>
          {canUpload && (
            <>
              <input ref={inputRef} type="file" onChange={handleSelected} hidden />
              <Button label="Upload File" icon="pi pi-upload" size="small" onClick={() => inputRef.current?.click()} loading={uploading} />
            </>
          )}
        </div>
        {loading ? <span className="text-color-secondary">Memuat attachment...</span> : attachments.length === 0 ? <span className="text-color-secondary">Belum ada attachment.</span> : (
          <div className="flex flex-column gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex align-items-center justify-content-between gap-2 border-1 surface-border border-round p-2">
                <div className="flex align-items-center gap-2 min-w-0">
                  <i className="pi pi-paperclip text-primary" />
                  {attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="entity-link white-space-nowrap overflow-hidden text-overflow-ellipsis">{attachment.fileName}</a> : <span>{attachment.fileName}</span>}
                  <span className="text-color-secondary text-sm">({formatFileSize(attachment.sizeBytes)})</span>
                </div>
                {canDelete && <Button icon="pi pi-trash" severity="danger" text rounded aria-label={`Hapus ${attachment.fileName}`} onClick={() => remove(attachment)} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
