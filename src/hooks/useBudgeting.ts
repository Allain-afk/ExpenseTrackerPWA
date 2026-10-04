import { useContext } from 'react';
import { BudgetingContext } from '../context/BudgetingContext';

export function useBudgeting() {
  const context = useContext(BudgetingContext);
  if (!context) {
    throw new Error('useBudgeting must be used within AppProviders.');
  }
  return context;
}
