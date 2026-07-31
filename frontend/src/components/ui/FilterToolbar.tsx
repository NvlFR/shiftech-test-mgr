import { useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';

type FilterToolbarProps = {
  children: ReactNode;
  secondaryActions?: ReactNode;
  primaryAction?: ReactNode;
  visible?: boolean;
  defaultVisible?: boolean;
  defaultFilterVisible?: boolean;
  filterVisible?: boolean;
  onToggleFilterVisible?: () => void;
};

export function FilterToolbar({ children, secondaryActions, primaryAction, visible = true, defaultVisible, defaultFilterVisible, filterVisible: controlledVisible, onToggleFilterVisible }: FilterToolbarProps) {
  const [internalVisible, setInternalVisible] = useState(defaultFilterVisible ?? defaultVisible ?? true);
  const filterVisible = controlledVisible ?? internalVisible;
  if (!visible) return null;
  return <>
    <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
      <Button icon={filterVisible ? 'pi pi-filter-fill' : 'pi pi-filter'} text rounded size="large" severity={filterVisible ? 'warning' : 'secondary'} onClick={onToggleFilterVisible ?? (() => setInternalVisible((current) => !current))} tooltip={filterVisible ? 'Sembunyikan filter' : 'Tampilkan filter'} tooltipOptions={{ position: 'bottom' }} />
      <div className="flex gap-2 align-items-center">
        <div className="mr-2">{secondaryActions}</div>
        {primaryAction}
      </div>
    </div>
    {filterVisible && <div className="grid mb-2 p-1">{children}</div>}
  </>;
}
