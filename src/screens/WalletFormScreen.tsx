import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { WalletForm } from '../components/forms/WalletForm';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useWallets } from '../hooks/useWallets';

export function WalletFormScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const wallets = useWallets();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const walletId = params.walletId ? Number(params.walletId) : null;
  const existingWallet = walletId ? wallets.getWalletById(walletId) : undefined;

  if (params.walletId && !Number.isFinite(walletId ?? NaN)) {
    return <Navigate replace to="/wallets" />;
  }

  if (params.walletId && !existingWallet) {
    return (
      <main className="app-page">
        <div className="app-card empty-state">
          <h3>Card not found</h3>
          <p>The selected card could not be found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          backTo={existingWallet ? '/wallets' : '/app/home'}
          title={existingWallet ? 'Edit Card' : 'Add Card'}
        />

        <WalletForm
          deleteBusy={false}
          initialWallet={existingWallet}
          onDelete={
            existingWallet
              ? async () => {
                  setIsDeleteOpen(true);
                }
              : undefined
          }
          onSubmit={async ({ colorValue, name, type }) => {
            if (existingWallet) {
              await wallets.updateWallet({
                ...existingWallet,
                name,
                type,
                colorValue,
              });
            } else {
              await wallets.addWallet({ name, type, colorValue });
            }

            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/wallets', { replace: true });
            }
          }}
          submitLabel={existingWallet ? 'Save Changes' : 'Add Card'}
        />
      </div>

      <ConfirmDialog
        confirmLabel="Delete Card"
        description="Associated transactions will stay in the database, but they will be unassigned from this card."
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async () => {
          if (existingWallet?.id) {
            await wallets.deleteWallet(existingWallet.id);
          }
          setIsDeleteOpen(false);
          navigate('/wallets', { replace: true });
        }}
        open={isDeleteOpen}
        title="Delete Card?"
        tone="danger"
      />
    </main>
  );
}
