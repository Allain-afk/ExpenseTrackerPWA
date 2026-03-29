import { MdAdd, MdRemove } from 'react-icons/md';
import type { TransactionType } from '../../types/models';

interface TransactionTypeIconProps {
  type: TransactionType;
  size?: number;
  dimension?: string;
  variant?: 'default' | 'subtle';
}

const transactionBadgePalette = {
  income: {
    default: {
      start: '#34d399',
      end: '#059669',
      shadow: 'rgba(16, 185, 129, 0.24)',
    },
    subtle: {
      start: '#6ee7b7',
      end: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.12)',
    },
  },
  expense: {
    default: {
      start: '#fb7185',
      end: '#e11d48',
      shadow: 'rgba(244, 63, 94, 0.24)',
    },
    subtle: {
      start: '#fda4af',
      end: '#f43f5e',
      shadow: 'rgba(244, 63, 94, 0.12)',
    },
  },
} as const;

export function TransactionTypeIcon({
  type,
  size = 20,
  dimension = '2.8rem',
  variant = 'subtle',
}: TransactionTypeIconProps) {
  const palette = transactionBadgePalette[type][variant];
  const isSubtle = variant === 'subtle';

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
        boxShadow: isSubtle ? `0 7px 14px ${palette.shadow}` : `0 14px 24px ${palette.shadow}`,
        border: isSubtle ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.28)',
        opacity: isSubtle ? 0.84 : 1,
        transform: isSubtle ? 'scale(0.96)' : 'scale(1)',
        transformOrigin: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: isSubtle ? '0.2rem' : '0.16rem',
          borderRadius: isSubtle ? '0.78rem' : '0.82rem',
          background: isSubtle
            ? 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.01) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 100%)',
        }}
      />
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isSubtle ? 0.88 : 1,
        }}
      >
        {type === 'income' ? <MdAdd size={size} /> : <MdRemove size={size} />}
      </span>
    </span>
  );
}
