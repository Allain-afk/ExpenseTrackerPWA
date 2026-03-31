import { useContext } from 'react';
import { BudgetsContext } from '../context/BudgetsContext';

export function useBudgets() {
  const context = useContext(BudgetsContext);

  if (!context) {
    throw new Error('useBudgets must be used within AppProviders.');
  }

  return context;
}
