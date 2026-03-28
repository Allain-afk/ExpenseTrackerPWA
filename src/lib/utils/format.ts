export function formatMoney(amount: number, currencySymbol: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currencySymbol}${formatted}`;
}

export function formatTransactionCount(count: number): string {
  return `${count} transaction${count === 1 ? '' : 's'}`;
}

export function numberToColorHex(colorValue: number): string {
  return `#${(colorValue & 0xffffff).toString(16).padStart(6, '0')}`;
}

export function colorHexToNumber(value: string): number {
  const normalized = value.replace('#', '');
  return Number.parseInt(`ff${normalized}`, 16);
}
