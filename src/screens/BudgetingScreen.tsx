import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdArrowForwardIos, MdDeleteOutline, MdEdit, MdSavings } from 'react-icons/md';
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

function getPlanTotals(plan: BudgetPlan) {
  const estimated = plan.cutoffs.reduce((sum, cutoff) => sum + cutoff.estimatedAmount, 0);
  const allocated = plan.cutoffs.reduce(
    (sum, cutoff) => sum + cutoff.allocations.reduce((cutoffSum, allocation) => cutoffSum + allocation.amount, 0),
    0,
  );
  return { estimated, allocated, remaining: estimated - allocated };
}

function getPercentage(allocated: number, estimated: number) {
  return estimated > 0 ? Math.min(100, Math.round((allocated / estimated) * 100)) : 0;
}

export function BudgetingScreen() {
  const { currencySymbol } = useSettings();
  const budgeting = useBudgeting();
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [planDraft, setPlanDraft] = useState<BudgetPlan>(emptyPlan);
  const [cutoffDraft, setCutoffDraft] = useState({ label: '', date: '', amount: '' });
  const [allocationDraft, setAllocationDraft] = useState({ cutoffId: '', particulars: '', amount: '', category: '', paymentMethod: '' });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [isCutoffFormOpen, setIsCutoffFormOpen] = useState(false);
  const [allocationFormCutoffId, setAllocationFormCutoffId] = useState<string | null>(null);

  const activePlan = useMemo(
    () => planId ? budgeting.plans.find((plan) => plan.id === planId) ?? null : null,
    [budgeting.plans, planId],
  );

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
    if (!activePlan?.id || !cutoffDraft.label.trim() || Number(cutoffDraft.amount) < 0) return;
    const cutoff: BudgetCutoff = {
      planId: activePlan.id,
      label: cutoffDraft.label.trim(),
      cutoffDate: cutoffDraft.date ? parseInputDate(cutoffDraft.date) : null,
      estimatedAmount: Number(cutoffDraft.amount),
      sortOrder: activePlan.cutoffs.length,
      allocations: [],
    };
    await budgeting.addCutoff(cutoff);
    setCutoffDraft({ label: '', date: '', amount: '' });
    setIsCutoffFormOpen(false);
  }

  async function addAllocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allocationDraft.cutoffId || !allocationDraft.particulars.trim() || Number(allocationDraft.amount) <= 0) return;
    const cutoff = activePlan?.cutoffs.find((item) => item.id === allocationDraft.cutoffId);
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
    setAllocationDraft({ cutoffId: '', particulars: '', amount: '', category: '', paymentMethod: '' });
    setAllocationFormCutoffId(null);
  }

  async function deletePlan() {
    if (!planToDelete) return;
    const deletingActivePlan = planToDelete === planId;
    await budgeting.deletePlan(planToDelete);
    setPlanToDelete(null);
    if (deletingActivePlan) navigate('/budgeting');
  }

  function openAllocationForm(cutoffId: string) {
    setAllocationDraft({ cutoffId, particulars: '', amount: '', category: '', paymentMethod: '' });
    setAllocationFormCutoffId(cutoffId);
  }

  const planEditor = (
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
  );

  if (!planId) {
    return (
      <main className={`app-page ${styles.page}`}>
        <PageHeader
          action={budgeting.plans.length > 0 ? <button aria-label="New budget plan" className={`primary-button ${styles.headerAction}`} onClick={startNewPlan} type="button"><MdAdd size={18} /><span>New plan</span></button> : null}
          backTo="/app/settings"
          subtitle="Choose a plan to review or update."
          title="Budgeting"
        />

        {budgeting.plans.length > 0 ? (
          <section aria-label="Budget plans" className={styles.planList}>
            {budgeting.plans.map((plan) => {
              const totals = getPlanTotals(plan);
              const percentage = getPercentage(totals.allocated, totals.estimated);
              return (
                <article className={`app-card ${styles.planCard}`} key={plan.id}>
                  <Link aria-label={`Open ${plan.title}`} className={styles.planCardLink} to={`/budgeting/${plan.id}`}>
                    <div className={styles.planCardTop}>
                      <div className={styles.planCardIcon}><MdSavings size={21} /></div>
                      <div className={styles.planCardCopy}><h2>{plan.title}</h2><p>{formatMediumDate(plan.periodStart)} – {formatMediumDate(plan.periodEnd)}</p></div>
                      <MdArrowForwardIos aria-hidden="true" className={styles.planArrow} size={16} />
                    </div>
                    <div className={styles.planCardNumbers}>
                      <div><span>Remaining</span><strong className={totals.remaining < 0 ? styles.over : ''}>{formatMoney(totals.remaining, currencySymbol)}</strong></div>
                      <div><span>Allocated</span><strong>{formatMoney(totals.allocated, currencySymbol)}</strong></div>
                    </div>
                    <div className={styles.planCardProgress}><span style={{ width: `${percentage}%` }} /></div>
                    <p className={styles.planCardMeta}>{plan.cutoffs.length} {plan.cutoffs.length === 1 ? 'pay period' : 'pay periods'} · {percentage}% allocated</p>
                  </Link>
                  <div className={styles.planCardActions}>
                    <button aria-label={`Edit ${plan.title}`} className={styles.iconButton} onClick={() => startEditPlan(plan)} type="button"><MdEdit size={18} /></button>
                    <button aria-label={`Delete ${plan.title}`} className={`${styles.iconButton} ${styles.dangerIconButton}`} onClick={() => setPlanToDelete(plan.id ?? null)} type="button"><MdDeleteOutline size={19} /></button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className={`app-card ${styles.emptyState}`}>
            <div className={styles.emptyIcon}><MdSavings size={28} /></div>
            <div><h2>Give your money a plan</h2><p>Map upcoming income to expenses before anything leaves your wallet.</p></div>
            <button className="primary-button" onClick={startNewPlan} type="button"><MdAdd size={18} /> Create budget plan</button>
          </section>
        )}

        {planEditor}
        <ConfirmDialog confirmLabel="Delete plan" description="Delete this saved plan and all of its pay periods and allocations? This will not affect your balances or transactions." onClose={() => setPlanToDelete(null)} onConfirm={deletePlan} open={planToDelete !== null} title="Delete saved plan" tone="danger" />
      </main>
    );
  }

  if (!activePlan) {
    return (
      <main className={`app-page ${styles.page}`}>
        <PageHeader backTo="/budgeting" subtitle="This plan may have been deleted." title="Plan not found" />
        <section className={`app-card ${styles.missingState}`}><p>Return to your saved plans and choose another budget.</p><Link className="primary-button" to="/budgeting">View budget plans</Link></section>
      </main>
    );
  }

  const totals = getPlanTotals(activePlan);
  const allocatedPercentage = getPercentage(totals.allocated, totals.estimated);

  return (
    <main className={`app-page ${styles.page}`}>
      <PageHeader
        action={<button aria-label="Edit budget plan" className={`secondary-button ${styles.headerAction}`} onClick={() => startEditPlan(activePlan)} type="button"><MdEdit size={17} /><span>Edit plan</span></button>}
        backTo="/budgeting"
        subtitle={`${formatMediumDate(activePlan.periodStart)} – ${formatMediumDate(activePlan.periodEnd)}`}
        title={activePlan.title}
      />

      <section className={`app-card ${styles.summaryCard}`}>
        <div className={styles.remainingBlock}><span>Remaining to plan</span><strong className={totals.remaining < 0 ? styles.over : ''}>{formatMoney(totals.remaining, currencySymbol)}</strong></div>
        <div className={styles.progressCopy}><span>{allocatedPercentage}% allocated</span><span>{formatMoney(totals.estimated, currencySymbol)} planned</span></div>
        <div className={styles.progressTrack} aria-label={`${allocatedPercentage}% of estimated budget allocated`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={allocatedPercentage}><span style={{ width: `${allocatedPercentage}%` }} /></div>
        <div className={styles.metrics}><div><span>Estimated income</span><strong>{formatMoney(totals.estimated, currencySymbol)}</strong></div><div><span>Allocated</span><strong>{formatMoney(totals.allocated, currencySymbol)}</strong></div></div>
      </section>

      <section className={styles.periodSection}>
        <div className={styles.sectionHeading}>
          <div><h2>Pay periods</h2><p>{activePlan.cutoffs.length} {activePlan.cutoffs.length === 1 ? 'period' : 'periods'} in this plan</p></div>
          {!isCutoffFormOpen ? <button className={styles.sectionAction} onClick={() => setIsCutoffFormOpen(true)} type="button"><MdAdd size={18} /> Add pay period</button> : null}
        </div>
        {isCutoffFormOpen ? (
          <form className={`app-card ${styles.cutoffForm}`} onSubmit={(event) => void addCutoff(event)}>
            <label><span>Period name</span><input autoFocus className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, label: event.target.value })} placeholder="First pay period" value={cutoffDraft.label} /></label>
            <label><span>Pay date</span><input className="field-input" onChange={(event) => setCutoffDraft({ ...cutoffDraft, date: event.target.value })} type="date" value={cutoffDraft.date} /></label>
            <label><span>Expected amount</span><input className="field-input" min="0" onChange={(event) => setCutoffDraft({ ...cutoffDraft, amount: event.target.value })} placeholder="0.00" step="0.01" type="number" value={cutoffDraft.amount} /></label>
            <div className={styles.formActions}><button className="secondary-button" onClick={() => setIsCutoffFormOpen(false)} type="button">Cancel</button><button className="primary-button" type="submit">Save period</button></div>
          </form>
        ) : null}
      </section>

      {activePlan.cutoffs.map((cutoff) => {
        const cutoffAllocated = cutoff.allocations.reduce((sum, item) => sum + item.amount, 0);
        const cutoffRemaining = cutoff.estimatedAmount - cutoffAllocated;
        const cutoffPercentage = getPercentage(cutoffAllocated, cutoff.estimatedAmount);
        const isAllocationFormOpen = allocationFormCutoffId === cutoff.id;
        return (
          <section className={`app-card ${styles.cutoffCard}`} key={cutoff.id}>
            <div className={styles.cutoffHeader}>
              <div><h3>{cutoff.label}</h3><p>{cutoff.cutoffDate ? formatMediumDate(cutoff.cutoffDate) : 'Date not set'}</p></div>
              <button aria-label={`Delete ${cutoff.label}`} className={`${styles.iconButton} ${styles.dangerIconButton}`} onClick={() => void budgeting.deleteCutoff(cutoff.id!)} type="button"><MdDeleteOutline size={20} /></button>
            </div>
            <div className={styles.cutoffBudget}>
              <div><span>Allocated</span><strong>{formatMoney(cutoffAllocated, currencySymbol)}</strong></div>
              <div><span>Remaining</span><strong className={cutoffRemaining < 0 ? styles.over : ''}>{formatMoney(cutoffRemaining, currencySymbol)}</strong></div>
              <div className={styles.cutoffProgress}><span style={{ width: `${cutoffPercentage}%` }} /></div>
            </div>
            <div className={styles.allocationList}>
              {cutoff.allocations.length === 0 ? <p className={styles.emptyAllocations}>No allocations in this period yet.</p> : null}
              {cutoff.allocations.map((allocation) => (
                <div className={styles.allocationRow} key={allocation.id}>
                  <div><strong>{allocation.particulars}</strong><span>{[allocation.category, allocation.paymentMethod].filter(Boolean).join(' · ') || 'Uncategorized'}</span></div>
                  <strong className={styles.allocationAmount}>{formatMoney(allocation.amount, currencySymbol)}</strong>
                  <button aria-label={`Delete ${allocation.particulars}`} className={styles.rowDeleteButton} onClick={() => void budgeting.deleteAllocation(allocation.id!)} type="button"><MdDeleteOutline size={17} /></button>
                </div>
              ))}
            </div>
            {isAllocationFormOpen ? (
              <form className={styles.allocationForm} onSubmit={(event) => void addAllocation(event)}>
                <input aria-label="Particulars" autoFocus className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, particulars: event.target.value })} placeholder="What is this for?" value={allocationDraft.particulars} />
                <input aria-label="Allocation amount" className="field-input" min="0" onChange={(event) => setAllocationDraft({ ...allocationDraft, amount: event.target.value })} placeholder="Amount" step="0.01" type="number" value={allocationDraft.amount} />
                <input aria-label="Payment method" className="field-input" onChange={(event) => setAllocationDraft({ ...allocationDraft, paymentMethod: event.target.value })} placeholder="Payment method" value={allocationDraft.paymentMethod} />
                <div className={styles.formActions}><button className="secondary-button" onClick={() => setAllocationFormCutoffId(null)} type="button">Cancel</button><button className="primary-button" type="submit">Save allocation</button></div>
              </form>
            ) : (
              <button aria-label={`Add allocation to ${cutoff.label}`} className={styles.addAllocationButton} onClick={() => openAllocationForm(cutoff.id!)} type="button"><MdAdd size={18} /> Add allocation</button>
            )}
          </section>
        );
      })}

      {activePlan.cutoffs.length === 0 && !isCutoffFormOpen ? <div className={styles.noPeriods}><p>No pay periods yet.</p><span>Add one to start allocating this plan.</span></div> : null}
      {planEditor}
      <ConfirmDialog confirmLabel="Delete plan" description="Delete this saved plan and all of its pay periods and allocations? This will not affect your balances or transactions." onClose={() => setPlanToDelete(null)} onConfirm={deletePlan} open={planToDelete !== null} title="Delete saved plan" tone="danger" />
    </main>
  );
}
