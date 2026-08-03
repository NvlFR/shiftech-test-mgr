import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { Toast } from 'primereact/toast';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useAuthContext } from '../../hooks/useAuth';
import { useComments } from '../../hooks/useComments';
import { commentService } from '../../services/commentService';
import { profileService } from '../../services/profileService';
import { formatDateTime } from '../../helpers/dateFormatter';
import { renderMentions, type KnownRefs } from '../../helpers/renderMentions';
import type { CommentTargetType, Profile } from '../../types/domain';

export function CommentsPanel({ projectId, targetType, targetId, canManage }: { projectId: string; targetType: CommentTargetType; targetId: string; canManage: boolean }) {
  const { session } = useAuthContext();
  const toast = useRef<Toast>(null);
  const { comments, loading, reload } = useComments(targetType, targetId);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [body, setBody] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.listAll().then((rows) => setProfiles(rows.filter((profile) => profile.role !== 'pending'))).catch(() => setProfiles([]));
  }, []);

  const knownRefs: KnownRefs = useMemo(() => ({
    usernames: new Set(profiles.map((profile) => profile.username.toLowerCase())),
    testCaseCodes: new Map(),
    issueCodes: new Map(),
  }), [profiles]);

  async function submit() {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      await commentService.create({ projectId, targetType, targetId, authorId: session.user.id, body, mentionedUserIds });
      setBody('');
      setMentionedUserIds([]);
      await reload();
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Komentar gagal disimpan', detail: error instanceof Error ? error.message : undefined });
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    try { await commentService.remove(id); await reload(); }
    catch (error) { toast.current?.show({ severity: 'error', summary: 'Komentar gagal dihapus', detail: error instanceof Error ? error.message : undefined }); }
  }

  return <>
    <Toast ref={toast} />
    <Card title={`Komentar (${comments.length})`} className="mb-3">
      <div className="flex flex-column gap-2 mb-3">
        <InputTextarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={5000} placeholder="Tulis komentar..." disabled={saving} />
        <div className="flex flex-wrap gap-2 align-items-center">
          <MultiSelect value={mentionedUserIds} onChange={(event) => setMentionedUserIds(event.value ?? [])} options={profiles.map((profile) => ({ label: profile.fullName ?? profile.email, value: profile.id }))} display="chip" filter placeholder="Mention user (opsional)" className="w-full md:w-20rem" disabled={saving} />
          <Button label="Kirim" icon="pi pi-send" size="small" onClick={submit} loading={saving} disabled={!body.trim()} />
        </div>
      </div>
      {loading ? <span className="text-color-secondary">Memuat komentar...</span> : comments.length === 0 ? <span className="text-color-secondary">Belum ada komentar.</span> : <div className="flex flex-column gap-3">
        {comments.map((comment) => <div key={comment.id} className="border-1 surface-border border-round p-3">
          <div className="flex justify-content-between align-items-start gap-2 mb-2">
            <span className="font-semibold">{comment.author?.fullName ?? comment.author?.email ?? 'User'}</span>
            <span className="text-color-secondary text-sm">{formatDateTime(comment.createdAt)}</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{renderMentions(comment.body, knownRefs)}</div>
          {comment.mentions.length > 0 && <small className="text-color-secondary block mt-2">
            Mention: {comment.mentions.map((mention, index) => <span key={mention.profile.id}>
              {index > 0 && ', '}
              <Link to={`/@${mention.profile.username}`} className="entity-link">{mention.profile.fullName ?? mention.profile.email}</Link>
            </span>)}
          </small>}
          {(comment.authorId === session?.user.id || canManage) && <Button label="Hapus" icon="pi pi-trash" text severity="danger" size="small" className="mt-2 p-0" onClick={() => remove(comment.id)} />}
        </div>)}
      </div>}
    </Card>
  </>;
}
