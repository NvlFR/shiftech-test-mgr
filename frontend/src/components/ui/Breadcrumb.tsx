import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Navigational trail shown above detail pages so users know which project/module they're in.
// Every item except the last is clickable; the last renders as plain text (current location).
export function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex align-items-center flex-wrap gap-2 mb-3 text-sm" aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex align-items-center gap-2">
            {index > 0 && <i className="pi pi-angle-right text-color-secondary" style={{ fontSize: '0.7rem' }} />}
            {isLast || !item.path ? (
              <span className={isLast ? 'text-color font-medium' : 'text-color-secondary'}>{item.label}</span>
            ) : (
              <a
                href={item.path}
                className="text-color-secondary hover:text-primary cursor-pointer"
                style={{ textDecoration: 'none' }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path!);
                }}
              >
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
