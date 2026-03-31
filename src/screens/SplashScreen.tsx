import { useEffect, useEffectEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppBootstrap } from '../hooks/useAppBootstrap';
import { useSettings } from '../hooks/useSettings';
import styles from './SplashScreen.module.css';

export function SplashScreen() {
  const navigate = useNavigate();
  const { bootstrap, bootstrapError, hasBootstrapped, isBootstrapping } = useAppBootstrap(true);
  const { isSetupComplete } = useSettings();

  const navigateAfterSplash = useEffectEvent(() => {
    navigate(isSetupComplete ? '/app/home' : '/setup', { replace: true });
  });

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const recoveryType = hashParams.get('type') ?? searchParams.get('type');

    if (window.location.pathname === '/' && recoveryType === 'recovery') {
      navigate('/reset-password', { replace: true });
      return;
    }

    if (!hasBootstrapped || isBootstrapping || bootstrapError) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigateAfterSplash();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [bootstrapError, hasBootstrapped, isBootstrapping]);

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <img alt="Expense Tracker" src="/pwa-192x192.png" />
        </div>
        <h1 className={styles.title}>Expense Tracker</h1>
        <p className={styles.subtitle}>Track your expenses offline.</p>
        {bootstrapError ? (
          <div className={styles.errorCard}>
            <p style={{ marginTop: 0 }}>{bootstrapError}</p>
            <button className="secondary-button" onClick={() => void bootstrap(true)} type="button">
              Retry
            </button>
          </div>
        ) : (
          <div aria-hidden="true" className={styles.loader} />
        )}
      </div>
    </main>
  );
}
