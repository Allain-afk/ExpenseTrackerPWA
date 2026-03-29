import { useState } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import type { Wallet } from '../../types/models';
import { walletColors, walletTypes } from '../../lib/constants/settings';
import { numberToColorHex } from '../../lib/utils/format';

interface WalletFormProps {
  initialWallet?: Wallet;
  submitLabel: string;
  loading?: boolean;
  deleteBusy?: boolean;
  onSubmit: (input: { name: string; type: string; colorValue: number; isHidden: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function WalletForm({
  initialWallet,
  submitLabel,
  loading = false,
  deleteBusy = false,
  onDelete,
  onSubmit,
}: WalletFormProps) {
  const [name, setName] = useState(initialWallet?.name ?? '');
  const [type, setType] = useState(initialWallet?.type ?? walletTypes[0]);
  const [colorValue, setColorValue] = useState(initialWallet?.colorValue ?? walletColors[0]);
  const [isHidden, setIsHidden] = useState(initialWallet?.isHidden ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Wallet name is required.');
      return;
    }

    setError(null);
    await onSubmit({ name: trimmedName, type, colorValue, isHidden });
  }

  return (
    <form className="stack-form" onSubmit={(event) => void handleSubmit(event)}>
      <div
        className="app-card"
        style={{
          padding: '1.1rem',
          background: `linear-gradient(135deg, ${numberToColorHex(colorValue)} 0%, rgba(255,255,255,0.25) 180%)`,
          color: 'white',
        }}
      >
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.82)' }}>
          Card Preview
        </p>
        <h2 style={{ margin: '0.35rem 0 0.2rem', fontSize: '1.45rem' }}>
          {name.trim() || 'Wallet Preview'}
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)' }}>{type}</p>
        {isHidden ? (
          <span
            className="tag"
            style={{ marginTop: '0.8rem', width: 'fit-content', background: 'rgba(255,255,255,0.18)', color: 'white' }}
          >
            Hidden on Home
          </span>
        ) : null}
      </div>

      <div className="app-card" style={{ padding: '1rem' }}>
        <div className="form-field">
          <label className="field-label" htmlFor="wallet-name">
            Wallet Name
          </label>
          <input
            className="text-input"
            id="wallet-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., GCash, BPI Savings, PayPal"
            value={name}
          />
        </div>
        <div className="form-field" style={{ marginTop: '1rem' }}>
          <label className="field-label" htmlFor="wallet-type">
            Type
          </label>
          <select
            className="select-input"
            id="wallet-type"
            onChange={(event) => setType(event.target.value)}
            value={type}
          >
            {walletTypes.map((walletType) => (
              <option key={walletType} value={walletType}>
                {walletType}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="app-card" style={{ padding: '1rem' }}>
        <p className="eyebrow">Card Color</p>
        <p className="helper-text">Choose the accent color for this wallet card.</p>
        <div className="pill-row" style={{ marginTop: '0.85rem' }}>
          {walletColors.map((color) => {
            const isActive = color === colorValue;
            return (
              <button
                aria-label={`Select color ${numberToColorHex(color)}`}
                key={color}
                onClick={() => setColorValue(color)}
                style={{
                  width: '2.9rem',
                  height: '2.9rem',
                  borderRadius: '999px',
                  border: isActive ? '3px solid white' : '1px solid rgba(217,227,240,0.9)',
                  boxShadow: isActive ? `0 0 0 3px ${numberToColorHex(color)}40` : 'none',
                  background: numberToColorHex(color),
                }}
                type="button"
              />
            );
          })}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="app-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <p className="eyebrow">Home Screen</p>
            <h3 style={{ margin: '0.35rem 0 0' }}>Card Visibility</h3>
            <p className="helper-text" style={{ marginTop: '0.35rem' }}>
              Hidden cards still work for balances and transactions. Only the Home screen card tile is hidden.
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setIsHidden((current) => !current)}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              minHeight: '3.25rem',
              background: isHidden ? 'var(--color-primary-soft)' : 'var(--color-surface)',
              color: isHidden ? 'var(--color-primary)' : 'var(--color-text)',
              border: isHidden
                ? '1px solid var(--color-primary-border)'
                : '1px solid var(--color-border)',
            }}
            type="button"
          >
            {isHidden ? <MdVisibility size={18} /> : <MdVisibilityOff size={18} />}
            {isHidden ? 'Show Card on Home' : 'Hide Card from Home'}
          </button>
        </div>
      </div>

      <button className="primary-button" disabled={loading} type="submit">
        {loading ? 'Saving...' : submitLabel}
      </button>

      {onDelete ? (
        <button
          className="danger-button"
          disabled={deleteBusy}
          onClick={() => void onDelete()}
          type="button"
        >
          {deleteBusy ? 'Deleting...' : 'Delete Card'}
        </button>
      ) : null}
    </form>
  );
}
