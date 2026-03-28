import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MdArrowBackIosNew } from 'react-icons/md';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ action, backTo, subtitle, title }: PageHeaderProps) {
  return (
    <header className="row-spread">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {backTo ? (
          <Link aria-label={`Back from ${title}`} className="overlay-close" to={backTo}>
            <MdArrowBackIosNew size={18} />
          </Link>
        ) : null}
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', letterSpacing: '-0.05em' }}>{title}</h1>
          {subtitle ? (
            <p className="muted" style={{ margin: '0.2rem 0 0' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}
