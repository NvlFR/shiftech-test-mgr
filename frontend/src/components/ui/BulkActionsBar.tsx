import type { ReactNode } from 'react';
import { Button } from 'primereact/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: ReactNode;
}

// Slim bar shown above a DataTable only while rows are selected — hosts bulk
// actions (e.g. "Hapus Terpilih") so they don't clutter the table toolbar.
export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex align-items-center justify-content-between flex-wrap gap-2 surface-100 border-round py-2 mb-2">
      <div className="flex align-items-center gap-2 flex-wrap">
        {actions}
        <Button label="Batal" size="small" severity="secondary" text onClick={onClear} />
      </div>
      <div className="flex align-items-center gap-2 flex-shrink-0">
        <span className="text-sm text-color-secondary">{selectedCount} dipilih</span>
      </div>
    </div>
  );
}
