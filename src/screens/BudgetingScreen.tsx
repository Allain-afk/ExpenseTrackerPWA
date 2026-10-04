import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAdd, MdDeleteOutline, MdEdit, MdSavings } from 'react-icons/md';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useBudgeting } from '../hooks/useBudgeting';
import { useSettings } from '../hooks/useSettings';
import { formatMoney } from '../lib/utils/format';
import { formatDateForInput, parseInputDate } from '../lib/utils/date';
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
      setIsPlanFormOpen(false);
      setEditingPlanId(null);
      setPlanDraft(emptyPlan());
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

  return (
    <main className={`app-page ${styles.page}`}>
      <PageHeader
        action={<button className="primary-button" onClick={() => { setPlanDraft(emptyPlan()); setEditingPlanId(null); setIsPlanFormOpen(true); }} type="button"><MdAdd size={18} /> New plan</button>}
        backTo="/app/settings"
        subtitle="Plan upcoming allocations without changing your balances."
        title="Budgeting"
      />

      {budgeting.plans.length ? (
        <section className={`app-card ${styles.selectorCard}`}>
          <div className={styles.selectorHeader}>
            <div>
              <p className="eyebrow">Your plans</p>
              <label className={styles.selectorLabel} htmlFor="budget-plan">Active budget plan</label>
            </div>
            <span className={styles.planCount}>{budgeting.plans.length} saved</span>
          </div>
          <select className="field-input" id="budget-plan" onChange={(event) => budgeting.selectPlan(event.target.value)} value={budgeting.selectedPlanId ?? ''}>
            {budgeting.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select>
          <div className={styles.planActions}>
            {selectedPlan ? <button className="secondary-button" onClick={() => startEditPlan(selectedPlan)} type="button"><MdEdit size={17} /> Edit plan</button> : null}
            {selectedPlan ? <button className="danger-button" onClick={() => setPlanToDelete(selectedPlan.id ?? null)} type="button"><MdDeleteOutline size={17} /> Delete</button> : null}
          </div>
        </section>
      ) : null}

      {isPlanFormOpen ? (
        <form className={`app-card ${styles.formCard}`} onSubmit={(event) => void savePlan(event)}>
          <div className={styles.formHeader}><div><p className="eyebrow">Planning guide</p><h2>{editingPlanId ? 'Edit plan' : 'Create a saved plan'}</h2></div></div>
          <div className={styles.formGrid}>
            <label className="form-field"><span className="field-label">Plan name</span><input className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, title: event.target.value })} placeholder="October 2026 Budget" value={planDraft.title} /></label>
            <label className="form-field"><span className="field-label">Start date</span><input className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, periodStart: parseInputDate(event.target.value) })} type="date" value={formatDateForInput(planDraft.periodStart)} /></label>
            <label className="form-field"><span className="field-label">End date</span><input className="field-input" onChange={(event) => setPlanDraft({ ...planDraft, periodEnd: parseInputDate(event.target.value) })} type="date" value={formatDateForInput(planDraft.periodEnd)} /></label>
          </div>
          <p className={styles.disclaimer}>Planning entries only. They will not change wallet balances or transactions.</p>
          <div className="inline-actions"><button className="secondary-button" onClick={() => setIsPlanFormOpen(false)} type="button">Cancel</button><button className="primary-button" type="submit">{editingPlanId ? 'Save plan' : 'Create plan'}</button></div>
        </form>
      ) : null}

      {selectedPlan ? (
        <>
          <section className={`app-card ${styles.summaryCard}`}>
            <div className={styles.summaryIcon}><MdSavings size={24} /></div>
            <div className={styles.summaryCopy}><p className="eyebrow">Planning summary</p><h2>{selectedPlan.title}</h2><p className="muted">{formatDateForInput(selectedPlan.periodStart)} to {formatDateForInput(selectedPlan.periodEnd)}</p></div>
            <div className={styles.metrics}><div><span>Estimated</span><strong>{formatMoney(totals.estimated, currencySymbol)}</strong></div><div><span>Allocated</span><strong>{formatMoney(totals.allocated, currencySymbol)}</strong></div><div><span>Remaining</span><strong className={totals.remaining < 0 ? styles.over : ''}>{formatMoney(totals.remaining, currencySymbol)}</strong></div></div>
            <div className={styles.progressTrack} aria-label={`${totals.estimated > 0 ? Math.min(100, Math.round((totals.allocated / totals.estimated) * 100)) : 0}% of estimated budget allocated`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={totals.estimated > 0 ? Math.min(100, Math.round((totals.allocated / totals.estimated) * 100)) : 0}><span style={{ width: `${totals.estimated > 0 ? Math.min(100, Math.max(0, (totals.allocated / totals.estimated) * 100)) : 0}%` }} /></div>
          </section>

          <section className={`app-card ${styles.formCard}`}>
            <div className={styles.sectionHeading}><div><p className="eyebrow">Plan structure</p><h2>Add cut-off</h2></div><span className={styles.sectionHint}>Split your plan into pay periods</span></div>
            <form className={styles.formGrid} onSubmit={(event) => void addCutoff(event)}>
              <input aria-label="Cut-off label" className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, label: event.target.value })} placeholder="1st Cut-Off" value={cutoffDraft.label} />
              <input aria-label="Cut-off date" className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, date: event.target.value })} type="date" value={cutoffDraft.date} />
              <input aria-label="Estimated amount" className="field-input" min="0" onChange={(event) => setCutoffDraft({ ...cutoffDraft, amount: event.target.value })} placeholder="Estimated amount" type="number" value={cutoffDraft.amount} />
              <button className="secondary-button" type="submit"><MdAdd size={18} /> Add cut-off</button>
            </form>
          </section>

          {selectedPlan.cutoffs.map((cutoff) => (
            <section className={`app-card ${styles.cutoffCard}`} key={cutoff.id}>
              <div className={styles.cutoffHeader}><div><p className="eyebrow">{cutoff.cutoffDate ? formatDateForInput(cutoff.cutoffDate) : 'Planning period'}</p><h2>{cutoff.label}</h2></div><strong>{formatMoney(cutoff.allocations.reduce((sum, item) => sum + item.amount, 0), currencySymbol)}</strong><button aria-label={`Delete ${cutoff.label}`} className={styles.iconButton} onClick={() => void budgeting.deleteCutoff(cutoff.id!)} type="button"><MdDeleteOutline size={20} /></button></div>
              <div className={styles.allocationList}>{cutoff.allocations.map((allocation) => <div className={styles.allocationRow} key={allocation.id}><div><strong>{allocation.particulars}</strong><span>{[allocation.category, allocation.paymentMethod].filter(Boolean).join(' · ') || 'Uncategorized'}</span></div><strong>{formatMoney(allocation.amount, currencySymbol)}</strong><button aria-label={`Delete ${allocation.particulars}`} className={styles.iconButton} onClick={() => void budgeting.deleteAllocation(allocation.id!)} type="button"><MdDeleteOutline size={18} /></button></div>)}</div>
              <form className={styles.allocationForm} onSubmit={(event) => void addAllocation(event)}>
                <input aria-label="Particulars" className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, particulars: event.target.value })} placeholder="Particulars" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.particulars : ''} />
                <input aria-label="Allocation amount" className="field-input" min="0" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, amount: event.target.value })} placeholder="Amount" type="number" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.amount : ''} />
                <input aria-label="Payment method" className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, cutoffId: cutoff.id!, paymentMethod: event.target.value })} placeholder="Cash / GCash / Card" value={allocationDraft.cutoffId === cutoff.id ? allocationDraft.paymentMethod : ''} />
                <button className="secondary-button" type="submit"><MdAdd size={18} /> Add allocation</button>
              </form>
            </section>
          ))}
        </>
      ) : (
        <section className={`app-card empty-state ${styles.emptyState}`}><MdSavings size={38} /><h2>No budget plan yet</h2><p>Create a saved planning guide for upcoming income and allocations.</p><button className="primary-button" onClick={() => setIsPlanFormOpen(true)} type="button"><MdAdd size={18} /> Create budget plan</button></section>
      )}

      <ConfirmDialog confirmLabel="Delete plan" description="Delete this saved plan and all of its cut-offs and allocations? This will not affect your balances or transactions." onClose={() => setPlanToDelete(null)} onConfirm={() => { if (planToDelete) void budgeting.deletePlan(planToDelete); setPlanToDelete(null); }} open={planToDelete !== null} title="Delete saved plan" tone="danger" />
      <Link className={styles.backLink} to="/app/settings">Back to Settings</Link>
    </main>
  );
}
