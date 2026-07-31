import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

type IssueDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  actualResult: string;
  expectedResult: string;
  error: string | null;
  saving?: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onActualResultChange: (value: string) => void;
  onExpectedResultChange: (value: string) => void;
  onHide: () => void;
  onSave: () => void;
};

export function IssueDialog({ visible, title, description, actualResult, expectedResult, error, saving = false, onTitleChange, onDescriptionChange, onActualResultChange, onExpectedResultChange, onHide, onSave }: IssueDialogProps) {
  return (
    <Dialog header="Buat Issue" visible={visible} onHide={saving ? () => undefined : onHide} closable={!saving} style={{ width: '32rem' }}>
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1"><label htmlFor="issue-title">Judul</label><InputText id="issue-title" value={title} onChange={(event) => onTitleChange(event.target.value)} invalid={Boolean(error && !title.trim())} autoFocus disabled={saving} /></div>
        <div className="flex flex-column gap-1"><label htmlFor="issue-description">Deskripsi</label><InputTextarea id="issue-description" value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={2} disabled={saving} /></div>
        <div className="flex flex-column gap-1"><label htmlFor="issue-actual">Hasil Aktual</label><InputTextarea id="issue-actual" value={actualResult} onChange={(event) => onActualResultChange(event.target.value)} rows={2} disabled={saving} /></div>
        <div className="flex flex-column gap-1"><label htmlFor="issue-expected">Hasil yang Diharapkan</label><InputTextarea id="issue-expected" value={expectedResult} onChange={(event) => onExpectedResultChange(event.target.value)} rows={2} disabled={saving} /></div>
        <Button label="Buat Issue" size="small" onClick={onSave} loading={saving} disabled={!title.trim()} />
      </div>
    </Dialog>
  );
}
