import { useState } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { walletColors } from '../../lib/constants/settings';
import { numberToColorHex } from '../../lib/utils/format';

interface MainWalletFormProps {
  initialColor: number;
  initialHidden: boolean;
  initialName: string;
  loading?: boolean;
  onSubmit: (input: {
    mainWalletColor: number;
    mainWalletHidden: boolean;
    mainWalletName: string;
  }) => Promise<void>;
  submitLabel?: string;
}

function getVisibilityButtonStyle(isHidden: boolean) {
  return {
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    minHeight: '3.25rem',
    background: isHidden ? 'rgba(37, 99, 235, 0.1)' : 'white',
    color: isHidden ? '#2563eb' : '#1e293b',
    border: isHidden ? '1px solid rgba(37, 99, 235, 0.22)' : '1px solid rgba(217, 227, 240, 0.9)',
  } as const;
}

export function MainWalletForm({
  initialColor,
  initialHidden,
  initialName,
  loading = false,
  onSubmit,
  submitLabel = 'Save Changes',
}: MainWalletFormProps) {
  const [name, setName] = useState(initialName);
  const [colorValue, setColorValue] = useState(initialColor);
  const [isHidden, setIsHidden] = useState(initialHidden);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      mainWalletName: name.trim() || 'Total Money',
      mainWalletColor: colorValue,
      mainWalletHidden: isHidden,
    });
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
          Main Card Preview
        </p>
        <h2 style={{ margin: '0.35rem 0 0.2rem', fontSize: '1.45rem' }}>
          {name.trim() || 'Total Money'}
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)' }}>
          Combined wallet balance
        </p>
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
          <label className="field-label" htmlFor="main-wallet-name">
            Wallet Name
          </label>
          <input
            className="text-input"
            id="main-wallet-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
      </div>

      <div className="app-card" style={{ padding: '1rem' }}>
        <p className="eyebrow">Card Color</p>
        <p className="helper-text">Choose the accent color for your combined balance card.</p>
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
      </div>

      <div className="app-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <p className="eyebrow">Home Screen</p>
            <h3 style={{ margin: '0.35rem 0 0' }}>Card Visibility</h3>
            <p className="helper-text" style={{ marginTop: '0.35rem' }}>
              Hiding this card only removes the combined balance tile from Home. Your wallets and transactions stay untouched.
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setIsHidden((current) => !current)}
            style={getVisibilityButtonStyle(isHidden)}
            type="button"
          >
            {isHidden ? <MdVisibility size={18} /> : <MdVisibilityOff size={18} />}
            {isHidden ? 'Show Main Card on Home' : 'Hide Main Card from Home'}
          </button>
        </div>
      </div>

      <button className="primary-button" disabled={loading} type="submit">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
