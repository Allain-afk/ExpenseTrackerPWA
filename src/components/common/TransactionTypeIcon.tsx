import { MdAdd, MdRemove } from 'react-icons/md';
import type { TransactionType } from '../../types/models';

interface TransactionTypeIconProps {
  type: TransactionType;
  size?: number;
  dimension?: string;
}

const transactionBadgePalette = {
  income: {
    start: '#34d399',
    end: '#059669',
    shadow: 'rgba(16, 185, 129, 0.24)',
  },
  expense: {
    start: '#fb7185',
    end: '#e11d48',
    shadow: 'rgba(244, 63, 94, 0.24)',
  },
} as const;

export function TransactionTypeIcon({
  type,
  size = 20,
  dimension = '2.8rem',
}: TransactionTypeIconProps) {
  const palette = transactionBadgePalette[type];

  return (
    <span
      aria-hidden="true"
      style={{
        width: dimension,
        height: dimension,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '1rem',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        color: 'white',
        background: `linear-gradient(145deg, ${palette.start} 0%, ${palette.end} 100%)`,
        boxShadow: `0 14px 24px ${palette.shadow}`,
        border: '1px solid rgba(255,255,255,0.28)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: '0.16rem',
          borderRadius: '0.82rem',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 100%)',
        }}
      />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {type === 'income' ? <MdAdd size={size} /> : <MdRemove size={size} />}
      </span>
    </span>
  );
}
