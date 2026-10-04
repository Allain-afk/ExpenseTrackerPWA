import { createContext, useContext, useState, type ReactNode } from 'react';
import { createBudgetingRepository } from '../lib/db/repositories/budgetingRepository';
import { databaseClient } from '../lib/db/client';
import type { BudgetAllocation, BudgetCutoff, BudgetPlan } from '../types/models';
import { AuthContext } from './AuthContext';

const repository = createBudgetingRepository(databaseClient);

export interface BudgetingContextValue {
  plans: BudgetPlan[];
  selectedPlanId: string | null;
  isLoaded: boolean;
  selectedPlan: BudgetPlan | null;
  loadPlans: () => Promise<BudgetPlan[]>;
  selectPlan: (planId: string) => void;
  addPlan: (plan: BudgetPlan) => Promise<string>;
  updatePlan: (plan: BudgetPlan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  addCutoff: (cutoff: BudgetCutoff) => Promise<string>;
  updateCutoff: (cutoff: BudgetCutoff) => Promise<void>;
  deleteCutoff: (cutoffId: string) => Promise<void>;
  addAllocation: (allocation: BudgetAllocation) => Promise<string>;
  updateAllocation: (allocation: BudgetAllocation) => Promise<void>;
  deleteAllocation: (allocationId: string) => Promise<void>;
}

export const BudgetingContext = createContext<BudgetingContextValue | null>(null);

export function BudgetingProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const userId = auth?.user?.id ?? null;

  async function loadPlans(): Promise<BudgetPlan[]> {
    const loaded = await repository.getAllPlans(userId);
    setPlans(loaded);
    setSelectedPlanId((current) => current && loaded.some((plan) => plan.id === current) ? current : loaded[0]?.id ?? null);
    setIsLoaded(true);
    return loaded;
  }

  async function addPlan(plan: BudgetPlan): Promise<string> {
    const owned = { ...plan, userId };
    const id = await repository.insertPlan(owned);
    const nextPlan = { ...owned, id, uuid: owned.uuid ?? id, cutoffs: owned.cutoffs ?? [] };
    setPlans((current) => [...current, nextPlan].sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime()));
    setSelectedPlanId(id);
    return id;
  }

  async function updatePlan(plan: BudgetPlan): Promise<void> {
    await repository.updatePlan(plan);
    setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, ...plan } : item));
  }

  async function deletePlan(planId: string): Promise<void> {
    await repository.deletePlan(planId);
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    setSelectedPlanId((current) => current === planId ? null : current);
  }

  async function addCutoff(cutoff: BudgetCutoff): Promise<string> {
    const owned = { ...cutoff, userId };
    const id = await repository.insertCutoff(owned);
    setPlans((current) => current.map((plan) => plan.id === cutoff.planId
      ? { ...plan, cutoffs: [...plan.cutoffs, { ...owned, id, uuid: owned.uuid ?? id, allocations: [] }] }
      : plan));
    return id;
  }

  async function updateCutoff(cutoff: BudgetCutoff): Promise<void> {
    await repository.updateCutoff(cutoff);
    setPlans((current) => current.map((plan) => ({
      ...plan,
      cutoffs: plan.cutoffs.map((item) => item.id === cutoff.id ? { ...item, ...cutoff } : item),
    })));
  }

  async function deleteCutoff(cutoffId: string): Promise<void> {
    await repository.deleteCutoff(cutoffId);
    setPlans((current) => current.map((plan) => ({
      ...plan,
      cutoffs: plan.cutoffs.filter((cutoff) => cutoff.id !== cutoffId),
    })));
  }

  async function addAllocation(allocation: BudgetAllocation): Promise<string> {
    const owned = { ...allocation, userId };
    const id = await repository.insertAllocation(owned);
    setPlans((current) => current.map((plan) => ({
      ...plan,
      cutoffs: plan.cutoffs.map((cutoff) => cutoff.id === allocation.cutoffId
        ? { ...cutoff, allocations: [...cutoff.allocations, { ...owned, id, uuid: owned.uuid ?? id }] }
        : cutoff),
    })));
    return id;
  }

  async function updateAllocation(allocation: BudgetAllocation): Promise<void> {
    await repository.updateAllocation(allocation);
    setPlans((current) => current.map((plan) => ({
      ...plan,
      cutoffs: plan.cutoffs.map((cutoff) => ({
        ...cutoff,
        allocations: cutoff.allocations.map((item) => item.id === allocation.id ? { ...item, ...allocation } : item),
      })),
    })));
  }

  async function deleteAllocation(allocationId: string): Promise<void> {
    await repository.deleteAllocation(allocationId);
    setPlans((current) => current.map((plan) => ({
      ...plan,
      cutoffs: plan.cutoffs.map((cutoff) => ({
        ...cutoff,
        allocations: cutoff.allocations.filter((allocation) => allocation.id !== allocationId),
      })),
    })));
  }

  return (
    <BudgetingContext.Provider value={{
      plans,
      selectedPlanId,
      isLoaded,
      selectedPlan: plans.find((plan) => plan.id === selectedPlanId) ?? null,
      loadPlans,
      selectPlan: setSelectedPlanId,
      addPlan,
      updatePlan,
      deletePlan,
      addCutoff,
      updateCutoff,
      deleteCutoff,
      addAllocation,
      updateAllocation,
      deleteAllocation,
    }}
    >
      {children}
    </BudgetingContext.Provider>
  );
}
