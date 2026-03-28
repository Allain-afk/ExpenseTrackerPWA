import type { ReactNode } from 'react';

interface SectionListProps {
  headerText?: string;
  footerText?: string;
  children: ReactNode;
}

export function SectionList({ children, footerText, headerText }: SectionListProps) {
  return (
    <section className="section-shell">
      {headerText ? (
        <div className="section-header">
          <h2>{headerText}</h2>
        </div>
      ) : null}
      <div className="inset-list">{children}</div>
      {footerText ? <p className="helper-text">{footerText}</p> : null}
    </section>
  );
}
