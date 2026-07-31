import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import type { TestCaseWithDetails } from '../../types/domain';

type CustomTestRunDialogProps = {
  visible: boolean;
  name: string;
  selectedCaseIds: string[];
  testCases: TestCaseWithDetails[];
  error: string | null;
  saving?: boolean;
  onNameChange: (value: string) => void;
  onSelectedCaseIdsChange: (value: string[]) => void;
  onHide: () => void;
  onSave: () => void;
};

export function CustomTestRunDialog({
  visible,
  name,
  selectedCaseIds,
  testCases,
  error,
  saving = false,
  onNameChange,
  onSelectedCaseIdsChange,
  onHide,
  onSave,
}: CustomTestRunDialogProps) {
  const options = testCases.map((testCase) => ({
    label: `${testCase.code} — ${testCase.title}`,
    value: testCase.id,
  }));

  return (
    <Dialog
      header="Custom Test Run"
      visible={visible}
      onHide={saving ? () => undefined : onHide}
      closable={!saving}
      style={{ width: '32rem' }}
      footer={
        <>
          <Button label="Batal" text onClick={onHide} disabled={saving} />
          <Button
            label="Mulai Run"
            icon="pi pi-play"
            onClick={onSave}
            loading={saving}
            disabled={!name.trim() || selectedCaseIds.length === 0}
          />
        </>
      }
    >
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="custom-run-name">Nama Test Run</label>
          <InputText
            id="custom-run-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            autoFocus
            className="w-full"
            disabled={saving}
          />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="custom-run-cases">Test Case</label>
          <MultiSelect
            inputId="custom-run-cases"
            value={selectedCaseIds}
            options={options}
            onChange={(event) => onSelectedCaseIdsChange(event.value ?? [])}
            filter
            display="chip"
            placeholder="Pilih test case"
            className="w-full"
            disabled={saving}
          />
        </div>
        <small className="text-color-secondary">
          Run ini tidak membutuhkan Test Plan. Scope test case disimpan sebagai snapshot.
        </small>
      </div>
    </Dialog>
  );
}
