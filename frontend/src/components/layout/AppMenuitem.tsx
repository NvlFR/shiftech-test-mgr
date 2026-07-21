import { NavLink } from 'react-router-dom';

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

export function AppMenuSeparator() {
  return <li className="layout-menu-separator" role="separator" />;
}
