import { createContext, useContext, useState, type ReactNode } from 'react';
import { createBudgetsRepository } from '../lib/db/repositories/budgetsRepository';
import { databaseClient } from '../lib/db/client';
import type { Budget } from '../types/models';
import { AuthContext } from './AuthContext';

const budgetsRepository = createBudgetsRepository(databaseClient);

export interface BudgetsContextValue {
  budgets: Budget[];
  isLoaded: boolean;
  loadBudgets: () => Promise<Budget[]>;
  addBudget: (budget: Budget) => Promise<string>;
  updateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  getBudgetByCategory: (category: string) => Budget | undefined;
}

export const BudgetsContext = createContext<BudgetsContextValue | null>(null);

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  async function loadBudgets(): Promise<Budget[]> {
    const loadedBudgets = await budgetsRepository.getAllBudgets(authContext?.user?.id ?? null);
    setBudgets(loadedBudgets);
    setIsLoaded(true);
    return loadedBudgets;
  }

  async function addBudget(budget: Budget): Promise<string> {
    const ownedBudget: Budget = {
      ...budget,
      userId: authContext?.user?.id ?? budget.userId ?? null,
    };

    const id = await budgetsRepository.insertBudget(ownedBudget);

    setBudgets((previousBudgets) => {
      const nextBudget: Budget = {
        ...ownedBudget,
        id,
        uuid: ownedBudget.uuid ?? id,
      };

      return [...previousBudgets, nextBudget].sort((left, right) => {
        return left.category.localeCompare(right.category);
      });
    });

    return id;
  }

  async function updateBudget(budget: Budget): Promise<void> {
    await budgetsRepository.updateBudget(budget);

    setBudgets((previousBudgets) => {
      return previousBudgets
        .map((previousBudget) => {
          if (previousBudget.id !== budget.id) {
            return previousBudget;
          }

          return {
            ...previousBudget,
            ...budget,
          };
        })
        .sort((left, right) => left.category.localeCompare(right.category));
    });
  }

  async function deleteBudget(budgetId: string): Promise<void> {
    await budgetsRepository.deleteBudget(budgetId);

    setBudgets((previousBudgets) => {
      return previousBudgets.filter((budget) => budget.id !== budgetId);
    });
  }

  function getBudgetByCategory(category: string): Budget | undefined {
    return budgets.find((budget) => budget.category.toLowerCase() === category.toLowerCase());
  }

  return (
    <BudgetsContext.Provider
      value={{
        budgets,
        isLoaded,
        loadBudgets,
        addBudget,
        updateBudget,
        deleteBudget,
        getBudgetByCategory,
      }}
    >
      {children}
    </BudgetsContext.Provider>
  );
}
