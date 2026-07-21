import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

// Every list/detail page renders its title through this component so spacing
// stays identical everywhere — do not hand-roll `<h2>` + wrapper divs in a page.
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-content-between align-items-center mb-3">
      <h2 className="m-0">{title}</h2>
      {actions}
    </div>
  );
}
