import { formatMoney } from '../../lib/utils/format';
import type { MonthlySummaryValue } from '../../lib/utils/monthlySummary';
import styles from './MonthlySummary.module.css';

interface MonthlySummaryProps {
  currencySymbol: string;
  value: MonthlySummaryValue;
}

export function MonthlySummary({ currencySymbol, value }: MonthlySummaryProps) {
  const roundedPercentage = Math.round(value.percentage);
  const progressPercentage = Math.min(Math.max(roundedPercentage, 0), 100);
  const remainingLabel = value.remaining < 0
    ? `${formatMoney(Math.abs(value.remaining), currencySymbol)} over`
    : formatMoney(value.remaining, currencySymbol);

  return (
    <section aria-labelledby="monthly-summary-title" className={`app-card ${styles.summary}`}>
      <div className={styles.header}>
        <h2 id="monthly-summary-title">This month</h2>
        <span className={`${styles.status} ${styles[value.status]}`}>
          {value.status === 'none' ? 'No monthly budget set' : `${roundedPercentage}% used`}
        </span>
      </div>

      <div className={styles.values}>
        <div>
          <span>Spent this month</span>
          <strong className="numeric-strong">{formatMoney(value.spent, currencySymbol)}</strong>
        </div>
        <div>
          <span>Budget left</span>
          <strong className="numeric-strong">{remainingLabel}</strong>
        </div>
      </div>

      {value.status !== 'none' ? (
        <div
          aria-label={`${roundedPercentage}% of the monthly budget used`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercentage}
          aria-valuetext={`${roundedPercentage}% used`}
          className={styles.progress}
          role="progressbar"
        >
          <span
            className={`${styles.progressFill} ${styles[value.status]}`}
            style={{ width: `${Math.min(value.percentage, 100)}%` }}
          />
        </div>
      ) : (
        <p className={styles.helper}>Set category budgets to track how much is left to spend.</p>
      )}
    </section>
  );
}
