import type { ReactNode } from 'react';

interface SectionListProps {
  headerText?: string;
  footerText?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionList({ action, children, footerText, headerText }: SectionListProps) {
  return (
    <section className="section-shell">
      {headerText || action ? (
        <div className="section-header">
          {headerText ? <h2>{headerText}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className="inset-list">{children}</div>
      {footerText ? <p className="helper-text">{footerText}</p> : null}
    </section>
  );
}
