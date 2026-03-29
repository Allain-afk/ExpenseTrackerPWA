import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MdCalendarToday, MdCreditCard, MdFolder } from 'react-icons/md';
import { useTransactions } from '../hooks/useTransactions';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { useWallets } from '../hooks/useWallets';
import { useSettings } from '../hooks/useSettings';
import { expenseCategories, incomeCategories } from '../lib/constants/categories';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { formatDateForInput, parseInputDate } from '../lib/utils/date';
import { GroupForm } from '../components/forms/GroupForm';
import { WalletForm } from '../components/forms/WalletForm';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { TransactionTypeIcon } from '../components/common/TransactionTypeIcon';
import styles from './TransactionFormScreen.module.css';

function parseOptionalNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function TransactionFormScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const settings = useSettings();
  const transactions = useTransactions();
  const groups = useExpenseGroups();
  const wallets = useWallets();

  const transactionId = params.transactionId ? Number(params.transactionId) : null;
  const existingTransaction = transactionId
    ? transactions.getTransactionById(transactionId)
    : undefined;
  const isEditing = Boolean(existingTransaction);

  const initialType = (searchParams.get('type') as 'income' | 'expense' | null) ?? 'expense';
  const initialGroupId = parseOptionalNumber(searchParams.get('groupId'));
  const initialWalletId = parseOptionalNumber(searchParams.get('walletId'));

  const [amount, setAmount] = useState(existingTransaction ? String(existingTransaction.amount) : '');
  const [description, setDescription] = useState(existingTransaction?.description ?? '');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(
    existingTransaction?.type ?? initialType,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    existingTransaction?.category ??
      ((initialType === 'income' ? incomeCategories[0] : expenseCategories[0]) as string),
  );
  const [selectedDate, setSelectedDate] = useState(existingTransaction?.date ?? new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    existingTransaction?.groupId ?? initialGroupId,
  );
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(
    existingTransaction?.walletId ?? initialWalletId,
  );
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [groupModalBusy, setGroupModalBusy] = useState(false);
  const [walletModalBusy, setWalletModalBusy] = useState(false);

  useEffect(() => {
    const categories = selectedType === 'expense' ? expenseCategories : incomeCategories;
    if (!categories.includes(selectedCategory as never)) {
      setSelectedCategory(categories[0]);
    }
  }, [selectedCategory, selectedType]);

  useEffect(() => {
    if (!isEditing && selectedWalletId === null && wallets.wallets.length > 0) {
      setSelectedWalletId(wallets.wallets[0].id ?? null);
    }
  }, [isEditing, selectedWalletId, wallets.wallets]);

  if (params.transactionId && !Number.isFinite(transactionId ?? NaN)) {
    return <Navigate replace to="/app/transactions" />;
  }

  if (params.transactionId && !existingTransaction) {
    return (
      <main className="app-page">
        <div className="app-card empty-state">
          <h3>Transaction not found</h3>
          <p>The selected transaction could not be found.</p>
        </div>
      </main>
    );
  }

  const categories = selectedType === 'expense' ? expenseCategories : incomeCategories;
  const selectedWallet = selectedWalletId ? wallets.getWalletById(selectedWalletId) : undefined;
  const selectedGroup = selectedGroupId ? groups.getGroupById(selectedGroupId) : undefined;
  const submitLabel = isEditing
    ? selectedType === 'income'
      ? 'Update Income'
      : 'Update Expense'
    : selectedType === 'income'
      ? 'Add Income'
      : 'Add Expense';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedInputAmount = Number.parseFloat(amount);

    if (!amount.trim() || Number.isNaN(parsedInputAmount)) {
      showErrorToast('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    if (!description.trim()) {
      showErrorToast('Description required', 'Please enter a description.');
      return;
    }

    if (!isEditing && wallets.wallets.length > 0 && selectedWalletId === null) {
      showErrorToast('Wallet required', 'Please select a specific wallet.');
      return;
    }

    try {
      if (isEditing && existingTransaction) {
        await transactions.updateTransaction({
          ...existingTransaction,
          amount: parsedInputAmount,
          category: selectedCategory,
          description: description.trim(),
          date: selectedDate,
          type: selectedType,
          groupId: selectedGroupId,
          walletId: existingTransaction.walletId ?? null,
        });
      } else {
        await transactions.addTransaction({
          amount: parsedInputAmount,
          category: selectedCategory,
          description: description.trim(),
          date: selectedDate,
          type: selectedType,
          groupId: selectedGroupId,
          walletId: selectedWalletId,
        });
      }

      showSuccessToast(
        isEditing ? 'Transaction updated' : 'Transaction added',
        `${description.trim()} | ${selectedCategory}`,
      );

      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/app/transactions', { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save the transaction.';
      showErrorToast('Transaction save failed', message);
    }
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          backButtonStyle={{ width: '2.55rem', height: '2.55rem' }}
          backTo="/app/transactions"
          leadingStyle={{ gap: '0.95rem', paddingInlineStart: '0.3rem' }}
          subtitle={
            isEditing
              ? 'Update the amount, category, wallet, and date in one clean flow.'
              : 'Capture the amount, category, wallet, and date in one clean flow.'
          }
          title={isEditing ? 'Edit Transaction' : 'Add Transaction'}
        />

        <form className={styles.layout} onSubmit={(event) => void handleSubmit(event)}>
          <div className={styles.typeSwitch}>
            <button
              aria-pressed={selectedType === 'expense'}
              className={`${styles.typeButton} ${
                selectedType === 'expense' ? styles.typeButtonActiveExpense : ''
              }`}
              onClick={() => setSelectedType('expense')}
              type="button"
            >
              <TransactionTypeIcon dimension="2.15rem" size={15} type="expense" />
              <span className={styles.typeButtonCopy}>
                <strong>Expense</strong>
                <small>Money out</small>
              </span>
            </button>
            <button
              aria-pressed={selectedType === 'income'}
              className={`${styles.typeButton} ${
                selectedType === 'income' ? styles.typeButtonActiveIncome : ''
              }`}
              onClick={() => setSelectedType('income')}
              type="button"
            >
              <TransactionTypeIcon dimension="2.15rem" size={15} type="income" />
              <span className={styles.typeButtonCopy}>
                <strong>Income</strong>
                <small>Money in</small>
              </span>
            </button>
          </div>

          <section className={`app-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <p className="eyebrow">Details</p>
              <h2>Core Details</h2>
              <p className={styles.sectionDescription}>
                Start with the amount, then add a clear description and category.
              </p>
            </div>

            <div className={styles.fieldGrid}>
              <div className={`${styles.amountField} ${styles.wideRow}`}>
                <label className="field-label" htmlFor="amount-input">
                  Amount ({settings.currencySymbol})
                </label>
                <div className={styles.amountShell}>
                  <span className={styles.amountPrefix}>{settings.currencySymbol}</span>
                  <input
                    className={styles.amountInput}
                    id="amount-input"
                    inputMode="decimal"
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={selectedType === 'income' ? '0.00 received' : '0.00 spent'}
                    value={amount}
                  />
                  <TransactionTypeIcon dimension="2.35rem" size={16} type={selectedType} />
                </div>
                <p className="helper-text">
                  {selectedType === 'income'
                    ? 'Record money coming in for this wallet.'
                    : 'Record spending and assign it to the right category.'}
                </p>
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="description-input">
                  Description
                </label>
                <input
                  className="text-input"
                  id="description-input"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    selectedType === 'income'
                      ? 'Salary, allowance, freelance work'
                      : 'Groceries, commute, coffee'
                  }
                  value={description}
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="category-input">
                  Category
                </label>
                <select
                  className="select-input"
                  id="category-input"
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  value={selectedCategory}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className={`app-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <p className="eyebrow">Assignment</p>
              <h2>Wallet &amp; Group</h2>
              <p className={styles.sectionDescription}>
                Choose where this transaction belongs and organize it if needed.
              </p>
            </div>

            <div className={styles.assignmentGrid}>
              {!isEditing ? (
                wallets.wallets.length ? (
                  <div className="form-field">
                    <label className="field-label" htmlFor="wallet-select">
                      Wallet (Required)
                    </label>
                    <select
                      className="select-input"
                      id="wallet-select"
                      onChange={(event) => setSelectedWalletId(parseOptionalNumber(event.target.value))}
                      value={selectedWalletId ?? ''}
                    >
                      {wallets.wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                    <p className="helper-text">New transactions are saved to one specific wallet card.</p>
                  </div>
                ) : (
                  <button
                    className={`${styles.actionRow} ${styles.wideRow}`}
                    onClick={() => setIsWalletModalOpen(true)}
                    type="button"
                  >
                    <span className="icon-chip accent-chip">
                      <MdCreditCard size={22} />
                    </span>
                    <span className="inset-item-content">
                      <span className="inset-title">Add your first card</span>
                      <span className="inset-subtitle">
                        Transactions need to be assigned to a card or wallet.
                      </span>
                    </span>
                  </button>
                )
              ) : selectedWallet ? (
                <div className={`${styles.lockedWallet} ${styles.wideRow}`}>
                  <span className="icon-chip accent-chip">
                    <MdCreditCard size={22} />
                  </span>
                  <span className="inset-item-content">
                    <span className="inset-title">{selectedWallet.name}</span>
                    <span className="inset-subtitle">
                      Wallet stays linked while you edit this transaction.
                    </span>
                  </span>
                </div>
              ) : (
                null
              )}

              {groups.groups.length ? (
                <div className="form-field">
                  <label className="field-label" htmlFor="group-select">
                    Expense Group (Optional)
                  </label>
                  <select
                    className="select-input"
                    id="group-select"
                    onChange={(event) => setSelectedGroupId(parseOptionalNumber(event.target.value))}
                    value={selectedGroupId ?? ''}
                  >
                    <option value="">No Group</option>
                    {groups.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <p className="helper-text">
                    {selectedGroup
                      ? `${selectedGroup.name} is currently selected.`
                      : 'Leave this empty if the transaction should stay outside a group.'}
                  </p>
                </div>
              ) : null}

              <button
                className={`${styles.actionRow} ${styles.wideRow}`}
                onClick={() => setIsGroupModalOpen(true)}
                type="button"
              >
                <span className="icon-chip accent-chip">
                  <MdFolder size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Create New Group</span>
                  <span className="inset-subtitle">
                    Create a group without leaving this form.
                  </span>
                </span>
              </button>
            </div>
          </section>

          <section className={`app-card ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <p className="eyebrow">Schedule</p>
              <h2>Date</h2>
              <p className={styles.sectionDescription}>
                Choose when this transaction happened.
              </p>
            </div>

            <div className={styles.datePanel}>
              <div className={styles.dateHeading}>
                <span className={`icon-chip ${styles.dateIcon}`}>
                  <MdCalendarToday size={22} />
                </span>
                <span className={styles.dateHeadingCopy}>
                  <span className="inset-title">Transaction date</span>
                  <span className="inset-subtitle">
                    Use the calendar to keep your history accurate.
                  </span>
                </span>
              </div>
              <label className={styles.dateField} htmlFor="transaction-date">
                <span className={styles.dateFieldLabel}>Date</span>
                <input
                  className={`date-input ${styles.dateInput}`}
                  id="transaction-date"
                  onChange={(event) => setSelectedDate(parseInputDate(event.target.value))}
                  type="date"
                  value={formatDateForInput(selectedDate)}
                />
              </label>
            </div>
          </section>

          <div className={styles.submitBar}>
            <button className={`primary-button ${styles.submitButton}`} type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>

      <Modal
        onClose={() => setIsGroupModalOpen(false)}
        open={isGroupModalOpen}
        title="Create New Group"
      >
        <GroupForm
          loading={groupModalBusy}
          onSubmit={async ({ description, name }) => {
            setGroupModalBusy(true);
            const now = new Date();
            try {
              const id = await groups.addExpenseGroup({
                name,
                description: description || null,
                createdAt: now,
                updatedAt: now,
              });
              setSelectedGroupId(id);
              setIsGroupModalOpen(false);
              showSuccessToast('Group created', `${name} is ready to organize expenses.`);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'We could not create the group.';
              showErrorToast('Group creation failed', message);
            } finally {
              setGroupModalBusy(false);
            }
          }}
          submitLabel="Create Group"
        />
      </Modal>

      <Modal
        onClose={() => setIsWalletModalOpen(false)}
        open={isWalletModalOpen}
        title="Add Card"
      >
        <WalletForm
          loading={walletModalBusy}
          onSubmit={async ({ colorValue, isHidden, name, type }) => {
            setWalletModalBusy(true);
            try {
              const id = await wallets.addWallet({ name, type, colorValue, isHidden });
              setSelectedWalletId(id);
              setIsWalletModalOpen(false);
              showSuccessToast(
                'Card added',
                isHidden
                  ? `${name} is hidden on Home, but available for this transaction.`
                  : `${name} is now available for transactions.`,
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'We could not add the card.';
              showErrorToast('Card creation failed', message);
            } finally {
              setWalletModalBusy(false);
            }
          }}
          submitLabel="Add Card"
        />
      </Modal>
    </main>
  );
}
