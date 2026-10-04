import { useMemo, useState } from 'react';
import { MdAdd, MdDeleteOutline, MdEdit, MdSavings } from 'react-icons/md';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { useBudgeting } from '../hooks/useBudgeting';
import { useSettings } from '../hooks/useSettings';
import { formatDateForInput, formatMediumDate, parseInputDate } from '../lib/utils/date';
import { formatMoney } from '../lib/utils/format';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import type { BudgetAllocation, BudgetCutoff, BudgetPlan } from '../types/models';
import styles from './BudgetingScreen.module.css';

function emptyPlan(): BudgetPlan {
  const now = new Date();
  return {
    title: '',
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    sortOrder: 0,
    cutoffs: [],
  };
}

export function BudgetingScreen() {
  const { currencySymbol } = useSettings();
  const budgeting = useBudgeting();
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [planDraft, setPlanDraft] = useState<BudgetPlan>(emptyPlan);
  const [cutoffDraft, setCutoffDraft] = useState({ label: '', date: '', amount: '' });
  const [allocationDraft, setAllocationDraft] = useState({ cutoffId: '', particulars: '', amount: '', category: '', paymentMethod: '' });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const selectedPlan = budgeting.selectedPlan;
  const totals = useMemo(() => {
    const estimated = selectedPlan?.cutoffs.reduce((sum, cutoff) => sum + cutoff.estimatedAmount, 0) ?? 0;
    const allocated = selectedPlan?.cutoffs.reduce(
      (sum, cutoff) => sum + cutoff.allocations.reduce((cutoffSum, allocation) => cutoffSum + allocation.amount, 0),
      0,
    ) ?? 0;
    return { estimated, allocated, remaining: estimated - allocated };
  }, [selectedPlan]);
  const allocatedPercentage = totals.estimated > 0
    ? Math.min(100, Math.round((totals.allocated / totals.estimated) * 100))
    : 0;

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planDraft.title.trim()) {
      showErrorToast('Missing plan title', 'Give this budget plan a name.');
      return;
    }
    try {
      if (editingPlanId) {
        await budgeting.updatePlan({ ...planDraft, id: editingPlanId });
        showSuccessToast('Plan updated', 'Your saved budget plan was updated.');
      } else {
        await budgeting.addPlan(planDraft);
        showSuccessToast('Plan created', 'Your new planning guide is ready.');
      }
      closePlanForm();
    } catch (error) {
      showErrorToast('Plan save failed', error instanceof Error ? error.message : 'Unable to save this plan.');
    }
  }

  async function addCutoff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan?.id || !cutoffDraft.label.trim() || Number(cutoffDraft.amount) < 0) return;
    const cutoff: BudgetCutoff = {
      planId: selectedPlan.id,
      label: cutoffDraft.label.trim(),
      cutoffDate: cutoffDraft.date ? parseInputDate(cutoffDraft.date) : null,
      estimatedAmount: Number(cutoffDraft.amount),
      sortOrder: selectedPlan.cutoffs.length,
      allocations: [],
    };
    await budgeting.addCutoff(cutoff);
    setCutoffDraft({ label: '', date: '', amount: '' });
  }

  async function addAllocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allocationDraft.cutoffId || !allocationDraft.particulars.trim() || Number(allocationDraft.amount) <= 0) return;
    const cutoff = selectedPlan?.cutoffs.find((item) => item.id === allocationDraft.cutoffId);
    if (!cutoff) return;
    const allocation: BudgetAllocation = {
      cutoffId: cutoff.id!,
      particulars: allocationDraft.particulars.trim(),
      amount: Number(allocationDraft.amount),
      category: allocationDraft.category || null,
      paymentMethod: allocationDraft.paymentMethod || null,
      sortOrder: cutoff.allocations.length,
    };
    await budgeting.addAllocation(allocation);
    setAllocationDraft({ cutoffId: allocationDraft.cutoffId, particulars: '', amount: '', category: '', paymentMethod: '' });
  }

  function startEditPlan(plan: BudgetPlan) {
    setEditingPlanId(plan.id ?? null);
    setPlanDraft(plan);
    setIsPlanFormOpen(true);
  }

  function startNewPlan() {
    setPlanDraft(emptyPlan());
    setEditingPlanId(null);
    setIsPlanFormOpen(true);
  }

  function closePlanForm() {
    setIsPlanFormOpen(false);
    setEditingPlanId(null);
    setPlanDraft(emptyPlan());
  }

  return (
    <main className={`app-page ${styles.page}`}>
      <PageHeader
        action={budgeting.plans.length > 0 ? (
          <button className={`primary-button ${styles.headerAction}`} onClick={startNewPlan} type="button">
            <MdAdd size={18} />
            <span>New plan</span>
          </button>
        ) : null}
        backTo="/app/settings"
        subtitle="Plan ahead without changing your wallet balances."
        title="Budgeting"
      />

      {budgeting.plans.length ? (
        <section aria-label="Plan controls" className={styles.planToolbar}>
          <div className={styles.planPicker}>
            <label className={styles.selectorLabel} htmlFor="budget-plan">Budget plan</label>
            <div className={styles.selectWrap}>
              <select className="field-input" id="budget-plan" onChange={(event) => budgeting.selectPlan(event.target.value)} value={budgeting.selectedPlanId ?? ''}>
                {budgeting.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
              </select>
              <span className={styles.planCount}>{budgeting.plans.length} saved</span>
            </div>
          </div>
          <div className={styles.planActions}>
            {selectedPlan ? <button aria-label="Edit active plan" className={styles.iconButton} onClick={() => startEditPlan(selectedPlan)} type="button"><MdEdit size={19} /></button> : null}
            {selectedPlan ? <button aria-label="Delete active plan" className={`${styles.iconButton} ${styles.dangerIconButton}`} onClick={() => setPlanToDelete(selectedPlan.id ?? null)} type="button"><MdDeleteOutline size={20} /></button> : null}
          </div>
        </section>
      ) : null}

      {selectedPlan ? (
        <>
          <section className={`app-card ${styles.summaryCard}`}>
            <div className={styles.summaryHeading}>
              <div className={styles.summaryIcon}><MdSavings size={22} /></div>
              <div className={styles.summaryCopy}>
                <h2>{selectedPlan.title}</h2>
                <p>{formatMediumDate(selectedPlan.periodStart)} – {formatMediumDate(selectedPlan.periodEnd)}</p>
              </div>
            </div>
            <div className={styles.remainingBlock}>
              <span>Remaining to plan</span>
              <strong className={totals.remaining < 0 ? styles.over : ''}>{formatMoney(totals.remaining, currencySymbol)}</strong>
            </div>
            <div className={styles.progressCopy}><span>{allocatedPercentage}% allocated</span><span>{formatMoney(totals.estimated, currencySymbol)} planned</span></div>
            <div className={styles.progressTrack} aria-label={`${allocatedPercentage}% of estimated budget allocated`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={allocatedPercentage}><span style={{ width: `${allocatedPercentage}%` }} /></div>
            <div className={styles.metrics}>
              <div><span>Estimated income</span><strong>{formatMoney(totals.estimated, currencySymbol)}</strong></div>
              <div><span>Allocated</span><strong>{formatMoney(totals.allocated, currencySymbol)}</strong></div>
            </div>
          </section>

          <section className={styles.periodSection}>
            <div className={styles.sectionHeading}>
              <div><h2>Pay periods</h2><p>Split this plan around the dates you expect income.</p></div>
              <span className={styles.periodCount}>{selectedPlan.cutoffs.length}</span>
            </div>
            <form className={`app-card ${styles.cutoffForm}`} onSubmit={(event) => void addCutoff(event)}>
              <label><span>Period name</span><input className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, label: event.target.value })} placeholder="First pay period" value={cutoffDraft.label} /></label>
              <label><span>Pay date</span><input className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, date: event.target.value })} type="date" value={cutoffDraft.date} /></label>
              <label><span>Expected amount</span><input className="field-input" min="0" onChange={(event) => setCutoffDraft({ ...cutoffDraft, amount: event.target.value })} placeholder="0.00" step="0.01" type="number" value={cutoffDraft.amount} /></label>
              <button className={`secondary-button ${styles.addPeriodButton}`} type="submit"><MdAdd size={18} /> Add period</button>
            </form>
          </section>

          {selectedPlan.cutoffs.map((cutoff) => {
            const cutoffAllocated = cutoff.allocations.reduce((sum, item) => sum + item.amount, 0);
            return (
              <section className={`app-card ${styles.cutoffCard}`} key={cutoff.id}>
                <div className={styles.cutoffHeader}>
                  <div><h3>{cutoff.label}</h3><p>{cutoff.cutoffDate ? formatMediumDate(cutoff.cutoffDate) : 'Date not set'}</p></div>
                  <div className={styles.cutoffTotal}><strong>{formatMoney(cutoffAllocated, currencySymbol)}</strong><span>of {formatMoney(cutoff.estimatedAmount, currencySymbol)}</span></div>
                  <button aria-label={`Delete ${cutoff.label}`} className={`${styles.iconButton} ${styles.dangerIconButton}`} onClick={() => void budgeting.deleteCutoff(cutoff.id!)} type="button"><MdDeleteOutline size={20} /></button>
                </div>
                <div className={styles.allocationList}>
                  {cutoff.allocations.length === 0 ? <p className={styles.emptyAllocations}>No allocations in this period yet.</p> : null}
                  {cutoff.allocations.map((allocation) => (
                    <div className={styles.allocationRow} key={allocation.id}>
                      <div><strong>{allocation.particulars}</strong><span>{[allocation.category, allocation.paymentMethod].filter(Boolean).join(' · ') || 'Uncategorized'}</span></div>
                      <strong>{formatMoney(allocation.amount, currencySymbol)}</strong>
                      <button aria-label={`Delete ${allocation.particulars}`} className={`${styles.iconButton} ${styles.rowDeleteButton}`} onClick={() => void budgeting.deleteAllocation(allocation.id!)} type="button"><MdDeleteOutline size={18} /></button>
                    </div>
                  ))}
                </div>
                <form className={styles.allocationForm} onSubmit={(event) => void addAllocation(event)}>
                  <input aria-label="Particulars" className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, particulars: event.target.value })} placeholder="What is this for?" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.particulars : ''} />
                  <input aria-label="Allocation amount" className="field-input" min="0" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, amount: event.target.value })} placeholder="Amount" step="0.01" type="number" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.amount : ''} />
                  <input aria-label="Payment method" className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, paymentMethod: event.target.value })} placeholder="Payment method" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.paymentMethod : ''} />
                  <button className="secondary-button" type="submit"><MdAdd size={18} /> Add allocation</button>
                </form>
              </section>
            );
          })}
        </>
      ) : (
        <section className={`app-card ${styles.emptyState}`}>
          <div className={styles.emptyIcon}><MdSavings size={28} /></div>
          <div><h2>Give your money a plan</h2><p>Map upcoming income to expenses before anything leaves your wallet.</p></div>
          <button className="primary-button" onClick={startNewPlan} type="button"><MdAdd size={18} /> Create budget plan</button>
        </section>
      )}

      <Modal
        description="Set a name and date range. Planning entries never change wallet balances."
        onClose={closePlanForm}
        open={isPlanFormOpen}
        title={editingPlanId ? 'Edit budget plan' : 'Create budget plan'}
        variant="sheet"
      >
        <form className={styles.planForm} onSubmit={(event) => void savePlan(event)}>
          <label className="form-field"><span className="field-label">Plan name</span><input autoFocus className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, title: event.target.value })} placeholder="October 2026 budget" value={planDraft.title} /></label>
          <div className={styles.dateGrid}>
            <label className="form-field"><span className="field-label">Start date</span><input className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, periodStart: parseInputDate(event.target.value) })} type="date" value={formatDateForInput(planDraft.periodStart)} /></label>
            <label className="form-field"><span className="field-label">End date</span><input className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, periodEnd: parseInputDate(event.target.value) })} type="date" value={formatDateForInput(planDraft.periodEnd)} /></label>
          </div>
          <div className={styles.modalActions}><button className="secondary-button" onClick={closePlanForm} type="button">Cancel</button><button className="primary-button" type="submit">{editingPlanId ? 'Save changes' : 'Create plan'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog confirmLabel="Delete plan" description="Delete this saved plan and all of its pay periods and allocations? This will not affect your balances or transactions." onClose={() => setPlanToDelete(null)} onConfirm={() => { if (planToDelete) void budgeting.deletePlan(planToDelete); setPlanToDelete(null); }} open={planToDelete !== null} title="Delete saved plan" tone="danger" />
    </main>
  );
}
