const pad = (value: number) => String(value).padStart(2, '0');

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function toSqliteTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
    + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fromSqliteTimestamp(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date();
  }

  // Supabase/Postgres often returns ISO timestamps (e.g. 2026-03-30T12:34:56.000Z).
  if (trimmed.includes('T')) {
    const isoParsed = new Date(trimmed);
    if (isValidDate(isoParsed)) {
      return isoParsed;
    }
  }

  const [datePart, timePart = '00:00:00'] = value.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const sqliteParsed = new Date(
    year,
    Number.isNaN(month) ? 0 : month - 1,
    Number.isNaN(day) ? 1 : day,
    Number.isNaN(hours) ? 0 : hours,
    Number.isNaN(minutes) ? 0 : minutes,
    Number.isNaN(seconds) ? 0 : seconds,
  );

  if (isValidDate(sqliteParsed)) {
    return sqliteParsed;
  }

  const fallbackParsed = new Date(trimmed);
  if (isValidDate(fallbackParsed)) {
    return fallbackParsed;
  }

  return new Date();
}

export function formatDateForInput(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
}

export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const base = new Date();
  return new Date(
    year ?? base.getFullYear(),
    (month ?? base.getMonth() + 1) - 1,
    day ?? base.getDate(),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
  );
}

export function formatGroupedDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatMediumDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function toIsoTimestamp(date: Date = new Date()): string {
  return isValidDate(date) ? date.toISOString() : new Date().toISOString();
}

export function fromIsoTimestamp(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
