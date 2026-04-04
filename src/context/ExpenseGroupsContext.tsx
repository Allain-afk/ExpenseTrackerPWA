import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createExpenseGroupsRepository } from '../lib/db/repositories/expenseGroupsRepository';
import { databaseClient } from '../lib/db/client';
import type { ExpenseGroup, ExpenseTransaction } from '../types/models';
import { TransactionsContext } from './TransactionsContext';
import { AuthContext } from './AuthContext';

const expenseGroupsRepository = createExpenseGroupsRepository(databaseClient);

export interface ExpenseGroupsContextValue {
  groups: ExpenseGroup[];
  groupTotals: Record<number, number>;
  groupTransactions: Record<number, ExpenseTransaction[]>;
  isLoaded: boolean;
  loadExpenseGroups: () => Promise<ExpenseGroup[]>;
  loadGroupTransactions: (groupId: number) => Promise<ExpenseTransaction[]>;
  addExpenseGroup: (group: ExpenseGroup) => Promise<number>;
  updateExpenseGroup: (group: ExpenseGroup) => Promise<void>;
  deleteExpenseGroup: (groupId: number) => Promise<void>;
  getGroupTotal: (groupId: number) => number;
  getGroupTransactions: (groupId: number) => ExpenseTransaction[];
  getGroupById: (groupId: number) => ExpenseGroup | undefined;
}

export const ExpenseGroupsContext = createContext<ExpenseGroupsContextValue | null>(null);

export function ExpenseGroupsProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const transactionsContext = useContext(TransactionsContext);
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const groupTransactions = useMemo(() => {
    return groups.reduce<Record<number, ExpenseTransaction[]>>((accumulator, group) => {
      if (!group.id) {
        return accumulator;
      }

      accumulator[group.id] =
        transactionsContext?.transactions.filter((transaction) => transaction.groupId === group.id) ?? [];

      return accumulator;
    }, {});
  }, [groups, transactionsContext?.transactions]);

  const groupTotals = useMemo(() => {
    return Object.entries(groupTransactions).reduce<Record<number, number>>(
      (accumulator, [groupId, transactionsForGroup]) => {
        accumulator[Number(groupId)] = transactionsForGroup.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        );
        return accumulator;
      },
      {},
    );
  }, [groupTransactions]);

  async function loadExpenseGroups(): Promise<ExpenseGroup[]> {
    const loadedGroups = await expenseGroupsRepository.getAllExpenseGroups();
    setGroups(loadedGroups);
    setIsLoaded(true);
    return loadedGroups;
  }

  async function loadGroupTransactions(groupId: number): Promise<ExpenseTransaction[]> {
    return transactionsContext?.transactions.filter((transaction) => transaction.groupId === groupId) ?? [];
  }

  async function addExpenseGroup(group: ExpenseGroup): Promise<number> {
    const ownedGroup: ExpenseGroup = {
      ...group,
      userId: authContext?.user?.id ?? group.userId ?? null,
    };

    const id = await expenseGroupsRepository.insertExpenseGroup(ownedGroup);

    setGroups((previousGroups) => {
      const nextGroup: ExpenseGroup = {
        ...ownedGroup,
        id,
      };

      return [nextGroup, ...previousGroups];
    });

    return id;
  }

  async function updateExpenseGroup(group: ExpenseGroup): Promise<void> {
    await expenseGroupsRepository.updateExpenseGroup(group);

    setGroups((previousGroups) => {
      return previousGroups.map((previousGroup) => {
        if (previousGroup.id !== group.id) {
          return previousGroup;
        }

        return {
          ...previousGroup,
          ...group,
        };
      });
    });
  }

  async function deleteExpenseGroup(groupId: number): Promise<void> {
    await expenseGroupsRepository.deleteExpenseGroup(groupId);

    setGroups((previousGroups) => {
      return previousGroups.filter((group) => group.id !== groupId);
    });

    transactionsContext?.clearTransactionGroup(groupId);
  }

  function getGroupTotal(groupId: number): number {
    return groupTotals[groupId] ?? 0;
  }

  function getGroupTransactions(groupId: number): ExpenseTransaction[] {
    return groupTransactions[groupId] ?? [];
  }

  function getGroupById(groupId: number): ExpenseGroup | undefined {
    return groups.find((group) => group.id === groupId);
  }

  return (
    <ExpenseGroupsContext.Provider
      value={{
        groups,
        groupTotals,
        groupTransactions,
        isLoaded,
        loadExpenseGroups,
        loadGroupTransactions,
        addExpenseGroup,
        updateExpenseGroup,
        deleteExpenseGroup,
        getGroupTotal,
        getGroupTransactions,
        getGroupById,
      }}
    >
      {children}
    </ExpenseGroupsContext.Provider>
  );
}
