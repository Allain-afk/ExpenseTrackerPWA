import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MdArrowBackIosNew } from 'react-icons/md';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
  headerStyle?: CSSProperties;
  leadingStyle?: CSSProperties;
  backButtonStyle?: CSSProperties;
}

export function PageHeader({
  action,
  backButtonStyle,
  backTo,
  headerStyle,
  leadingStyle,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header className="row-spread" style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', ...leadingStyle }}>
        {backTo ? (
          <Link
            aria-label={`Back from ${title}`}
            className="overlay-close"
            style={backButtonStyle}
            to={backTo}
          >
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
