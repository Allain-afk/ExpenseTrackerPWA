import { useContext } from 'react';
import { ExpenseGroupsContext } from '../context/ExpenseGroupsContext';

export function useExpenseGroups() {
  const context = useContext(ExpenseGroupsContext);

  if (!context) {
    throw new Error('useExpenseGroups must be used within AppProviders.');
  }

  return context;
}
