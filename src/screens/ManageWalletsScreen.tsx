import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MdAccountBalanceWallet,
  MdAdd,
  MdChevronRight,
  MdCreditCard,
  MdDragIndicator,
  MdEdit,
  MdVisibilityOff,
} from 'react-icons/md';
import { useWallets } from '../hooks/useWallets';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { MainWalletForm } from '../components/forms/MainWalletForm';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { formatMoney, numberToColorHex } from '../lib/utils/format';
import type { Wallet } from '../types/models';
import styles from './ManageWalletsScreen.module.css';

interface SortableWalletRowProps {
  wallet: Wallet;
  balanceLabel: string;
}

function SortableWalletRow({ wallet, balanceLabel }: SortableWalletRowProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallet.id! });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={`app-card ${styles.walletCard} ${isDragging ? styles.walletCardDragging : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <div className={styles.walletRow}>
        <div className={styles.walletIdentity}>
          <span
            className="icon-chip"
            style={{ background: numberToColorHex(wallet.colorValue), color: 'white' }}
          >
            <MdCreditCard size={22} />
          </span>
          <div className={styles.walletCopy}>
            <h3>{wallet.name}</h3>
            <p>{wallet.type}</p>
            {wallet.isHidden ? (
              <span className={`tag ${styles.hiddenTag}`}>
                <MdVisibilityOff size={13} />
                Hidden on Home
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.walletSide}>
          <strong className={styles.balanceValue}>{balanceLabel}</strong>
          <div className={styles.walletActions}>
            <Link
              aria-label={`Edit ${wallet.name}`}
              className={styles.iconActionButton}
              to={`/wallets/${wallet.id}/edit`}
            >
              <MdEdit size={18} />
            </Link>
            <button
              {...attributes}
              {...listeners}
              aria-label={`Reorder ${wallet.name}`}
              className={styles.iconActionButton}
              ref={setActivatorNodeRef}
              type="button"
            >
              <MdDragIndicator size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManageWalletsScreen() {
  const wallets = useWallets();
  const transactions = useTransactions();
  const settings = useSettings();
  const [isMainWalletOpen, setIsMainWalletOpen] = useState(false);
  const [pendingWalletOrder, setPendingWalletOrder] = useState<number[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortableWalletIds = useMemo(() => {
    const persistedIds = wallets.wallets
      .map((wallet) => wallet.id)
      .filter((walletId): walletId is number => typeof walletId === 'number');

    if (!pendingWalletOrder) {
      return persistedIds;
    }

    const persistedSet = new Set(persistedIds);
    const pendingIds = pendingWalletOrder.filter((walletId) => persistedSet.has(walletId));
    const pendingSet = new Set(pendingIds);
    const missingIds = persistedIds.filter((walletId) => !pendingSet.has(walletId));

    return [...pendingIds, ...missingIds];
  }, [wallets.wallets, pendingWalletOrder]);

  const orderedWallets = useMemo(() => {
    const walletById = new Map<number, Wallet>();
    const walletsWithoutId: Wallet[] = [];

    for (const wallet of wallets.wallets) {
      if (typeof wallet.id === 'number') {
        walletById.set(wallet.id, wallet);
      } else {
        walletsWithoutId.push(wallet);
      }
    }

    const ordered = sortableWalletIds
      .map((walletId) => walletById.get(walletId))
      .filter((wallet): wallet is Wallet => Boolean(wallet));

    return [...ordered, ...walletsWithoutId];
  }, [wallets.wallets, sortableWalletIds]);

  const totalBalance = wallets.wallets.reduce((sum, wallet) => {
    return sum + transactions.getWalletBalance(wallet.id!);
  }, 0);
  const mainWalletBalance = wallets.wallets.length === 0 ? transactions.balance : totalBalance;
  const cardCount = wallets.wallets.length + 1;
  const hiddenCount =
    wallets.wallets.filter((wallet) => wallet.isHidden).length +
    (settings.mainWalletHidden ? 1 : 0);
  const mainCardGradient = `linear-gradient(135deg, ${numberToColorHex(settings.mainWalletColor)} 0%, rgba(255,255,255,0.24) 180%)`;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortableWalletIds.findIndex((walletId) => walletId === active.id);
    const newIndex = sortableWalletIds.findIndex((walletId) => walletId === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const walletIds = arrayMove(sortableWalletIds, oldIndex, newIndex);

    setPendingWalletOrder(walletIds);

    try {
      await wallets.reorderWallets(walletIds);
      setPendingWalletOrder(null);
      showSuccessToast('Card order updated', 'Home will use your new card order.');
    } catch (error) {
      setPendingWalletOrder(null);
      const message =
        error instanceof Error ? error.message : 'We could not save the new card order.';
      showErrorToast('Card order update failed', message);
    }
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          action={
            <Link className="primary-button" to="/wallets/new">
              <MdAdd size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Add Card
            </Link>
          }
          backTo="/app/settings"
          title="Manage Cards"
        />

        <button
          className={`app-card ${styles.summaryCard}`}
          onClick={() => setIsMainWalletOpen(true)}
          style={{ background: mainCardGradient, textAlign: 'left', width: '100%' }}
          type="button"
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryBadge}>
              <MdAccountBalanceWallet size={16} />
              Main Card
            </span>
            <span className={styles.summaryChevron}>
              <MdChevronRight size={22} />
            </span>
          </div>

          <p className={styles.summaryLabel}>Combined balance card</p>
          <h2>{formatMoney(mainWalletBalance, settings.currencySymbol)}</h2>

          <div className={styles.summaryFooter}>
            <div>
              <p className={styles.summaryName}>{settings.mainWalletName}</p>
              <p className={styles.summaryMeta}>
                {cardCount} card{cardCount === 1 ? '' : 's'}
                {hiddenCount ? ` | ${hiddenCount} hidden on Home` : ''}
              </p>
            </div>
            {settings.mainWalletHidden ? (
              <span className={`tag ${styles.summaryTag}`}>
                <MdVisibilityOff size={13} />
                Hidden on Home
              </span>
            ) : null}
          </div>
        </button>

        {orderedWallets.length ? (
          <>
            <div className={styles.dragHint}>
              <p className="eyebrow">Home Card Order</p>
              <p className={styles.dragHelper}>
                Drag a handle to change which wallet card appears first on Home.
              </p>
            </div>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
              sensors={sensors}
            >
              <SortableContext items={sortableWalletIds} strategy={verticalListSortingStrategy}>
                <div className={styles.walletList}>
                  {orderedWallets.map((wallet) => (
                    <SortableWalletRow
                      balanceLabel={formatMoney(
                        transactions.getWalletBalance(wallet.id!),
                        settings.currencySymbol,
                      )}
                      key={wallet.id}
                      wallet={wallet}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        ) : (
          <div className="app-card empty-state">
            <h3>No additional cards yet</h3>
            <p>Your main card is ready. Add another card to separate balances by account.</p>
            <Link className="primary-button" style={{ marginTop: '1rem', display: 'inline-flex' }} to="/wallets/new">
              <MdAdd size={18} style={{ marginRight: '0.35rem' }} />
              Add Card
            </Link>
          </div>
        )}
      </div>

      <Modal
        description="Update the label, accent color, and visibility for your combined balance card."
        onClose={() => setIsMainWalletOpen(false)}
        open={isMainWalletOpen}
        title="Edit Main Card"
      >
        <MainWalletForm
          initialColor={settings.mainWalletColor}
          initialHidden={settings.mainWalletHidden}
          initialName={settings.mainWalletName}
          onSubmit={async ({ mainWalletColor, mainWalletHidden, mainWalletName }) => {
            try {
              await settings.updateMainWallet({
                mainWalletName,
                mainWalletColor,
                mainWalletHidden,
              });
              setIsMainWalletOpen(false);
              showSuccessToast(
                'Main card updated',
                mainWalletHidden
                  ? `${mainWalletName} is now hidden on Home.`
                  : `${mainWalletName} is visible on Home.`,
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'We could not update the main card.';
              showErrorToast('Main card update failed', message);
            }
          }}
        />
      </Modal>
    </main>
  );
}
