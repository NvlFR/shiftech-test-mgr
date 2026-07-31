import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { issueService } from '../../services/issueService';
import { issueAttachmentService } from '../../services/issueAttachmentService';
import type { IssueAttachment } from '../../types/domain';
import { profileService } from '../../services/profileService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useAuthContext } from '../../hooks/useAuth';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CommentsPanel } from '../../components/ui/CommentsPanel';
import type { BreadcrumbItem } from '../../components/ui/Breadcrumb';
import type { IssuePriority, IssueStatus, IssueWithDetails, Profile } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
} from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const
).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

const PRIORITY_OPTIONS: { label: string; value: IssuePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));

type IssueDetail = IssueWithDetails & { projectId: string | null };

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testRunId = searchParams.get('testRunId');
  const toast = useRef<Toast>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuthContext();

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const { canManageIssues, canDeleteContent } = useProjectRole(issue?.projectId ?? undefined);

  async function reload() {
    if (!id) return;
    const result = await issueService.getById(id);
    setIssue(result);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([issueService.getById(id), profileService.listAll()]).then(([issueResult, users]) => {
      setIssue(issueResult);
      setApprovedUsers(users.filter((p) => p.role === 'user' || p.role === 'admin'));
      setLoading(false);
    });
  }, [id]);

  async function reloadAttachments() {
    if (!id) return;
    setAttachmentsLoading(true);
    try {
      setAttachments(await issueAttachmentService.listByIssue(id));
    } finally {
      setAttachmentsLoading(false);
    }
  }

  useEffect(() => {
    void reloadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (issue?.projectId) projectService.getById(issue.projectId).then((p) => setProjectName(p?.name ?? null));
  }, [issue?.projectId]);

  function handleBack() {
    if (testRunId) {
      navigate(`/test-runs/${testRunId}/issues`);
    } else if (issue?.projectId) {
      navigate(`/projects/${issue.projectId}`);
    } else {
      navigate('/');
    }
  }

  // --- Edit dialog ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editActual, setEditActual] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [editPriority, setEditPriority] = useState<IssuePriority>('medium');
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditDescription(issue.description ?? '');
    setEditActual(issue.actualResult ?? '');
    setEditExpected(issue.expectedResult ?? '');
    setEditPriority(issue.priority);
    setEditError(null);
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!issue) return;
    setEditError(null);
    try {
      await issueService.update(issue.id, {
        title: editTitle,
        description: editDescription,
        actualResult: editActual,
        expectedResult: editExpected,
        priority: editPriority,
      });
      setEditDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Issue diperbarui' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan issue');
    }
  }

  async function handleChangeStatus(status: IssueStatus) {
    if (!issue) return;
    await issueService.changeStatus(issue.id, status);
    await reload();
  }

  async function handleAssign(assignedTo: string | null | undefined) {
    if (!issue) return;
    await issueService.assign(issue.id, assignedTo ?? null);
    await reload();
  }

  function handleDelete() {
    if (!issue) return;
    confirmDialog({
      header: 'Hapus Issue',
      message: `Issue "${issue.title}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await issueService.remove(issue.id);
        toast.current?.show({ severity: 'success', summary: 'Issue dihapus' });
        handleBack();
      },
    });
  }

  function handleArchive() {
    if (!issue) return;
    confirmDialog({
      header: 'Arsipkan Issue',
      message: `Issue "${issue.title}" akan diarsipkan (ditutup). Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Arsipkan',
      rejectLabel: 'Batal',
      accept: async () => {
        await issueService.changeStatus(issue.id, 'closed');
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Issue diarsipkan' });
      },
    });
  }

  async function handleAttachmentSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !issue || !profile) return;

    setAttachmentUploading(true);
    try {
      const attachment = await issueAttachmentService.upload(issue.id, file, profile.id);
      setAttachments((current) => [attachment, ...current]);
      toast.current?.show({ severity: 'success', summary: 'Attachment berhasil diupload' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Upload attachment gagal', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setAttachmentUploading(false);
    }
  }

  function handleRemoveAttachment(attachment: IssueAttachment) {
    confirmDialog({
      header: 'Hapus Attachment',
      message: `File "${attachment.fileName}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await issueAttachmentService.remove(attachment);
          setAttachments((current) => current.filter((item) => item.id !== attachment.id));
          toast.current?.show({ severity: 'success', summary: 'Attachment dihapus' });
        } catch (err) {
          toast.current?.show({ severity: 'error', summary: 'Gagal menghapus attachment', detail: err instanceof Error ? err.message : undefined });
        }
      },
    });
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading || !issue) {
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Projects', path: '/' },
      { label: issue ? (projectName ?? '…') : '…', path: issue?.projectId ? `/projects/${issue.projectId}` : undefined },
      { label: loading ? '…' : 'Issue tidak ditemukan' },
    ];
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        {!loading && <p>Issue tidak ditemukan.</p>}
      </div>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Projects', path: '/' },
    { label: projectName ?? '…', path: issue.projectId ? `/projects/${issue.projectId}` : undefined },
    { label: issue.code, path: `/issues/${issue.id}` },
  ];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb items={breadcrumbItems} />

      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <h2>Rincian Issue</h2>
        </div>
        <div className="flex gap-2">
          {canManageIssues && <Button label="Edit" icon="pi pi-pencil" size="small" outlined onClick={openEditDialog} />}
          {canDeleteContent ? (
            <Button label="Hapus" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleDelete} />
          ) : (
            canManageIssues &&
            issue.status !== 'closed' && (
              <Button label="Arsipkan" icon="pi pi-inbox" size="small" outlined onClick={handleArchive} />
            )
          )}
        </div>
      </div>

      <Card className="mb-3">
        <div className="flex align-items-center gap-2 mb-1">
          <h2 className="m-0">{issue.code} — {issue.title}</h2>
          {issue.type && <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} />}
          <Tag value={ISSUE_PRIORITY_LABEL[issue.priority]} severity={ISSUE_PRIORITY_SEVERITY[issue.priority]} />
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="text-color-secondary">
            Test Case:{' '}
            {issue.testCase ? (
              <a
                className="entity-link"
                onClick={() => navigate(`/test-cases/${issue.testCase!.id}`)}
              >
                {issue.testCase.code} - {issue.testCase.title}
              </a>
            ) : (
              <span className="text-color">-</span>
            )}
          </span>
          <span className="text-color-secondary">
            Test Run:{' '}
            {issue.testRun ? (
              <a
                className="entity-link"
                onClick={() => navigate(`/test-runs/${issue.testRun!.id}`)}
              >
                {issue.testRun.code} - {issue.testRun.name}
              </a>
            ) : (
              <span className="text-color">-</span>
            )}
          </span>
          <span className="text-color-secondary">Dibuat: <span className="text-color">{formatDateTime(issue.createdAt)}</span></span>
          <span className="text-color-secondary">Update Terakhir: <span className="text-color">{formatDateTime(issue.updatedAt)}</span></span>
        </div>

        {issue.testCase && (
          <div className="flex flex-wrap align-items-center gap-4 mt-2 text-sm">
            <span className="text-color-secondary">
              Modul: <span className="text-color">{issue.testCase.module?.name ?? '-'}</span>
            </span>
            <span className="text-color-secondary flex align-items-center gap-2">
              Prioritas Test Case:{' '}
              <Tag
                value={TEST_CASE_PRIORITY_LABEL[issue.testCase.priority]}
                severity={TEST_CASE_PRIORITY_SEVERITY[issue.testCase.priority]}
              />
            </span>
            {issue.testCase.tags.length > 0 && (
              <span className="text-color-secondary flex align-items-center gap-2">
                Tag:
                <span className="flex flex-wrap gap-1">
                  {issue.testCase.tags.map((tag) => (
                    <Tag key={tag.id} value={tag.name} severity="info" />
                  ))}
                </span>
              </span>
            )}
          </div>
        )}

        <div className="grid mt-3">
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label className="text-color-secondary text-sm">Status</label>
            <Dropdown value={issue.status} options={STATUS_OPTIONS} onChange={(e) => handleChangeStatus(e.value)} disabled={!canManageIssues} className="w-full" />
          </div>
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label className="text-color-secondary text-sm">Ditugaskan Ke</label>
            <Dropdown
              value={issue.assignedTo}
              options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
              onChange={(e) => handleAssign(e.value)}
              placeholder="Belum ditugaskan"
              showClear
              disabled={!canManageIssues}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {issue.description && (
        <Card title="Deskripsi" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.description}</p>
        </Card>
      )}

      {issue.actualResult && (
        <Card title="Hasil Aktual" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.actualResult}</p>
        </Card>
      )}

      {issue.expectedResult && (
        <Card title="Hasil yang Diharapkan" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.expectedResult}</p>
        </Card>
      )}

      {issue.externalLinks && issue.externalLinks.length > 0 && (
        <Card title="External Links" className="mb-3">
          <div className="flex flex-column gap-2">
            {issue.externalLinks.map((link, index) => (
              <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className="entity-link">
                <i className="pi pi-external-link mr-2" />
                {link.label || link.url}
              </a>
            ))}
          </div>
        </Card>
      )}

      {issue.projectId && <CommentsPanel projectId={issue.projectId} targetType="issue" targetId={issue.id} canManage={canManageIssues} />}

      <Card title={`Attachment (${attachments.length})`} className="mb-3">
        <div className="flex justify-content-between align-items-center gap-2 mb-3">
          <span className="text-color-secondary text-sm">Maksimal 10 MB per file.</span>
          {canManageIssues && (
            <>
              <input ref={attachmentInputRef} type="file" onChange={handleAttachmentSelected} hidden />
              <Button label="Upload File" icon="pi pi-upload" size="small" onClick={() => attachmentInputRef.current?.click()} loading={attachmentUploading} />
            </>
          )}
        </div>
        {attachmentsLoading ? (
          <span className="text-color-secondary">Memuat attachment...</span>
        ) : attachments.length === 0 ? (
          <span className="text-color-secondary">Belum ada attachment.</span>
        ) : (
          <div className="flex flex-column gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex align-items-center justify-content-between gap-2 border-1 surface-border border-round p-2">
                <div className="flex align-items-center gap-2 min-w-0">
                  <i className="pi pi-paperclip text-primary" />
                  {attachment.url ? (
                    <a href={attachment.url} target="_blank" rel="noreferrer" className="entity-link white-space-nowrap overflow-hidden text-overflow-ellipsis">
                      {attachment.fileName}
                    </a>
                  ) : (
                    <span>{attachment.fileName}</span>
                  )}
                  <span className="text-color-secondary text-sm">({formatFileSize(attachment.sizeBytes)})</span>
                </div>
                {canManageIssues && <Button icon="pi pi-trash" severity="danger" text rounded aria-label={`Hapus ${attachment.fileName}`} onClick={() => handleRemoveAttachment(attachment)} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- Edit Dialog --- */}
      <Dialog header="Edit Issue" visible={editDialogOpen} onHide={() => setEditDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {editError && <small className="p-error">{editError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-title">Judul</label>
            <InputText id="issue-edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-priority">Prioritas</label>
            <Dropdown id="issue-edit-priority" value={editPriority} options={PRIORITY_OPTIONS} onChange={(e) => setEditPriority(e.value)} className="w-full" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-description">Deskripsi</label>
            <InputTextarea id="issue-edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-actual">Hasil Aktual</label>
            <InputTextarea id="issue-edit-actual" value={editActual} onChange={(e) => setEditActual(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-expected">Hasil yang Diharapkan</label>
            <InputTextarea id="issue-edit-expected" value={editExpected} onChange={(e) => setEditExpected(e.target.value)} rows={2} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveEdit} />
        </div>
      </Dialog>
    </div>
  );
}
