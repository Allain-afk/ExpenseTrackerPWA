import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { WalletForm } from '../components/forms/WalletForm';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useWallets } from '../hooks/useWallets';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';

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
          onSubmit={async ({ colorValue, isHidden, name, type }) => {
            try {
              if (existingWallet) {
                await wallets.updateWallet({
                  ...existingWallet,
                  name,
                  type,
                  colorValue,
                  isHidden,
                });
              } else {
                await wallets.addWallet({ name, type, colorValue, isHidden });
              }

              showSuccessToast(
                existingWallet ? 'Card updated' : 'Card added',
                isHidden
                  ? `${name} is hidden on Home, but still works everywhere else.`
                  : `${name} is ready to track transactions.`,
              );

              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/wallets', { replace: true });
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'We could not save the card.';
              showErrorToast('Card save failed', message);
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
          try {
            if (existingWallet?.id) {
              await wallets.deleteWallet(existingWallet.id);
              showSuccessToast('Card deleted', `${existingWallet.name} was removed.`);
            }
            setIsDeleteOpen(false);
            navigate('/wallets', { replace: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'We could not delete the card.';
            showErrorToast('Card delete failed', message);
          }
        }}
        open={isDeleteOpen}
        title="Delete Card?"
        tone="danger"
      />
    </main>
  );
}
