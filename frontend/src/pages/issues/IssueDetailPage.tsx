import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { issueService } from '../../services/issueService';
import type { IssueAttachment } from '../../types/domain';
import { profileService } from '../../services/profileService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useAuthContext } from '../../hooks/useAuth';
import { useIssueAttachments } from '../../hooks/useIssueAttachments';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CommentsPanel } from '../../components/ui/CommentsPanel';
import { IssueEditor, type IssueFormData } from '../../components/issues/IssueEditor';
import { useIssueEditorOptions } from '../../hooks/useIssueEditorOptions';
import type { BreadcrumbItem } from '../../components/ui/Breadcrumb';
import type { IssueStatus, IssueWithDetails, Profile } from '../../types/domain';
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
  ['draft', 'backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const
).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

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
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const { attachments, loading: attachmentsLoading, upload: uploadAttachment, remove: removeAttachment } = useIssueAttachments(id ?? null);
  const { canManageIssues, canDeleteContent } = useProjectRole(issue?.projectId ?? undefined);
  const { testRoles, projectMembers } = useIssueEditorOptions(issue?.projectId ?? null);

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

  function openEditDialog() {
    if (!issue) return;
    setEditDialogOpen(true);
  }

  async function handleSaveEdit(data: IssueFormData) {
    if (!issue) return;
    await issueService.update(issue.id, data);
    if (data.status !== issue.status) await issueService.changeStatus(issue.id, data.status);
    if (data.assignedTo !== issue.assignedTo) await issueService.assign(issue.id, data.assignedTo);
    setEditDialogOpen(false);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Issue diperbarui' });
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
      await uploadAttachment(file, profile.id);
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
          await removeAttachment(attachment);
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
          <span className="text-color-secondary">
            Target Role: <span className="text-color">{issue.targetRole?.name ?? '-'}</span>
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

      <IssueEditor
        visible={editDialogOpen}
        onHide={() => setEditDialogOpen(false)}
        onSave={handleSaveEdit}
        testRoles={testRoles}
        projectMembers={projectMembers}
        initialData={{
          title: issue.title,
          type: issue.type ?? 'bug',
          priority: issue.priority,
          status: issue.status,
          assignedTo: issue.assignedTo,
          targetRoleId: issue.targetRoleId ?? null,
          description: issue.description ?? '',
          actualResult: issue.actualResult ?? '',
          expectedResult: issue.expectedResult ?? '',
          externalLinks: issue.externalLinks ?? [],
        }}
      />
    </div>
  );
}
