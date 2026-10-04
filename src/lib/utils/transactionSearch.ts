import type { ExpenseTransaction } from '../../types/models';

export interface TransactionFilterOptions {
  transactions: ExpenseTransaction[];
  type: 'All' | 'Income' | 'Expense';
  query: string;
  getWalletName: (walletId: number) => string | undefined;
  getGroupName: (groupId: number) => string | undefined;
}

export function filterTransactions({
  transactions,
  type,
  query,
  getWalletName,
  getGroupName,
}: TransactionFilterOptions): ExpenseTransaction[] {
  const needle = query.trim().toLocaleLowerCase();

  return transactions.filter((transaction) => {
    if (type !== 'All' && transaction.type !== type.toLocaleLowerCase()) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const walletName = typeof transaction.walletId === 'number'
      ? getWalletName(transaction.walletId)
      : undefined;
    const groupName = typeof transaction.groupId === 'number'
      ? getGroupName(transaction.groupId)
      : undefined;

    return [transaction.description, transaction.category, walletName, groupName]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(needle));
  });
}
