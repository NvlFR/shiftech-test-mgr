import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { useBreadcrumbContext } from '../layout/BreadcrumbContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const MAX_LABEL_LENGTH = 30;

function truncateLabel(label: string): string {
  return label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label;
}

function BreadcrumbTrail({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const navigate = useNavigate();

  return (
    <nav className={className} aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = truncateLabel(item.label);
        return (
          <span key={index} className="flex align-items-center gap-2">
            {index > 0 && <i className="pi pi-angle-right text-color-secondary" style={{ fontSize: '0.7rem' }} />}
            {!item.path ? (
              <span className={isLast ? 'text-color font-bold' : 'text-color-secondary'} title={label !== item.label ? item.label : undefined}>{label}</span>
            ) : (
              <a
                href={item.path}
                className={`breadcrumb-link cursor-pointer ${isLast ? 'text-color font-bold' : 'text-color-secondary'}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (isLast) {
                    window.location.href = item.path!;
                  } else {
                    navigate(item.path!);
                  }
                }}
              >
                {label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function BreadcrumbCollapsed({ items }: { items: BreadcrumbItem[] }) {
  const navigate = useNavigate();
  const menuRef = useRef<Menu>(null);
  const hiddenItems = items.slice(0, -1);
  const lastItem = items.at(-1);
  const menuItems = hiddenItems.map((item) => ({
    label: truncateLabel(item.label),
    command: item.path ? () => navigate(item.path!) : undefined,
  }));

  return (
    <nav className="flex lg:hidden align-items-center gap-2 text-sm min-w-0" aria-label="breadcrumb">
      {hiddenItems.length > 0 && (
        <>
          <Button icon="pi pi-ellipsis-h" text rounded severity="secondary" size="small" aria-label="Tampilkan jalur breadcrumb" onClick={(event) => menuRef.current?.toggle(event)} />
          <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />
          <span className="text-color-secondary">/</span>
        </>
      )}
      <span className="text-color font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis" title={lastItem?.label}>
        {lastItem ? truncateLabel(lastItem.label) : ''}
      </span>
    </nav>
  );
}

// Navigational trail shown above detail pages so users know which project/module they're in.
// On desktop it's rendered inside the topbar (via BreadcrumbContext, see AppTopbar); this
// The responsive topbar renders either the full or collapsed trail.
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    // No cleanup: the next page's Breadcrumb sets its own items on mount before
    // this one's cleanup would run, so clearing here only causes a blank flash
    // in the topbar between unmount and the next page's effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  return null;
}

export { BreadcrumbTrail };
