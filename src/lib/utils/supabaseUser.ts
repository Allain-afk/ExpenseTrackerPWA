export function getSupabaseDisplayName(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return '';
  }

  const metadata = input as Record<string, unknown>;
  const displayName = metadata.display_name;
  const fullName = metadata.full_name;
  const name = metadata.name;

  if (typeof displayName === 'string' && displayName.trim()) {
    return displayName.trim();
  }

  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  return '';
}
