import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface MenuItemModel {
  label: string;
  icon: string;
  url: string;
  end?: boolean;
}

export function AppMenuitem({ item, onNavigate }: { item: MenuItemModel; onNavigate?: () => void }) {
  return (
    <li className="layout-root-menuitem">
      <NavLink
        to={item.url}
        end={item.end ?? item.url === '/'}
        onClick={onNavigate}
        className={({ isActive }) => `layout-menuitem-link ${isActive ? 'active-route' : ''}`}
      >
        <i className={`layout-menuitem-icon ${item.icon}`} />
        <span className="layout-menuitem-text">{item.label}</span>
      </NavLink>
    </li>
  );
}

// Tree node whose label links directly to `url` (e.g. "Projects" → /projects);
// the chevron button on the right independently expands/collapses the children.
export function AppMenuTreeItem({
  label,
  icon,
  url,
  onNavigate,
  defaultOpen = true,
  onAdd,
  addLabel,
  children,
}: {
  label: string;
  icon: string;
  url: string;
  onNavigate?: () => void;
  defaultOpen?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(defaultOpen || location.pathname === '/' || location.pathname.startsWith('/projects'));

  return (
    <li className="layout-root-menuitem">
      <div className="layout-menuitem-toggle-row">
        <NavLink
          to={url}
          end
          onClick={onNavigate}
          className={({ isActive }) => `layout-menuitem-link layout-menuitem-toggle ${isActive ? 'active-route' : ''}`}
        >
          <i className={`layout-menuitem-icon ${icon}`} />
          <span className="layout-menuitem-text">{label}</span>
        </NavLink>
        {onAdd && (
          <button
            type="button"
            className="layout-menuitem-add"
            title={addLabel ?? 'Tambah'}
            aria-label={addLabel ?? 'Tambah'}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <i className="pi pi-plus" />
          </button>
        )}
        <button
          type="button"
          className="layout-menuitem-expand"
          aria-label={open ? 'Tutup' : 'Buka'}
          onClick={() => setOpen((o) => !o)}
        >
          <i className={`pi ${open ? 'pi-chevron-down' : 'pi-chevron-right'} layout-menuitem-toggle-icon`} />
        </button>
      </div>
      {open && <ul className="layout-submenu">{children}</ul>}
    </li>
  );
}
