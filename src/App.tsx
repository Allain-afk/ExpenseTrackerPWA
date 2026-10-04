import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './context/AppProviders';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useSettings } from './hooks/useSettings';
import { AppShell } from './components/layout/AppShell';
import { SplashScreen } from './screens/SplashScreen';
import { SetupScreen } from './screens/SetupScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { AppToaster } from './components/common/AppToaster';
import { SyncAdoptionModal } from './components/common/SyncAdoptionModal';

const DetailedAnalytics = lazy(async () => {
  const module = await import('./screens/DetailedAnalytics');
  return { default: module.DetailedAnalytics };
});

const GroupDetailScreen = lazy(async () => ({
  default: (await import('./screens/GroupDetailScreen')).GroupDetailScreen,
}));
const ManageWalletsScreen = lazy(async () => ({
  default: (await import('./screens/ManageWalletsScreen')).ManageWalletsScreen,
}));
const BudgetingScreen = lazy(async () => ({
  default: (await import('./screens/BudgetingScreen')).BudgetingScreen,
}));
const TransactionFormScreen = lazy(async () => ({
  default: (await import('./screens/TransactionFormScreen')).TransactionFormScreen,
}));
const GroupFormScreen = lazy(async () => ({
  default: (await import('./screens/GroupFormScreen')).GroupFormScreen,
}));
const WalletFormScreen = lazy(async () => ({
  default: (await import('./screens/WalletFormScreen')).WalletFormScreen,
}));

function RouteFallback() {
  return (
    <div className="full-screen-state">
      <div className="app-card state-card">
        <div className="spinner" aria-hidden="true" />
        <h1>Opening screen...</h1>
        <p>Your offline data is ready while this view loads.</p>
      </div>
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function BootstrapBoundary({
  children,
  requireSetup,
}: {
  children: ReactNode;
  requireSetup?: boolean;
}) {
  const { bootstrap, bootstrapError, hasBootstrapped, isBootstrapping } = useAppBootstrap(true);
  const { isSetupComplete } = useSettings();
  const bypassSetupOnce = typeof window !== 'undefined'
    && window.sessionStorage.getItem('bypass_setup_once') === 'true';

  if (bootstrapError) {
    return (
      <div className="full-screen-state">
        <div className="app-card state-card">
          <p className="eyebrow">Startup Error</p>
          <h1>We could not open the offline database.</h1>
          <p>{bootstrapError}</p>
          <button className="primary-button" onClick={() => void bootstrap(true)} type="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isBootstrapping || !hasBootstrapped) {
    return (
      <div className="full-screen-state">
        <div className="app-card state-card">
          <div className="spinner" aria-hidden="true" />
          <h1>Loading your offline data...</h1>
          <p>The local database and preferences are being prepared.</p>
        </div>
      </div>
    );
  }

  if (requireSetup && !isSetupComplete && !bypassSetupOnce) {
    return <Navigate replace to="/setup" />;
  }

  if (bypassSetupOnce) {
    window.sessionStorage.removeItem('bypass_setup_once');
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { currencySymbol } = useSettings();

  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route
        path="/setup"
        element={
          <BootstrapBoundary>
            <SetupScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/app/:tab?"
        element={
          <BootstrapBoundary requireSetup>
            <AppShell />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/groups/new"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><GroupFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/groups/:groupId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><GroupFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><GroupDetailScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><TransactionFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/transactions/:transactionId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><TransactionFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><ManageWalletsScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/budgeting"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><BudgetingScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/budgeting/:planId"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><BudgetingScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets/new"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><WalletFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets/:walletId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <LazyRoute><WalletFormScreen /></LazyRoute>
          </BootstrapBoundary>
        }
      />
      <Route
        path="/analytics"
        element={
          <BootstrapBoundary requireSetup>
            <Suspense fallback={<RouteFallback />}>
              <DetailedAnalytics currencySymbol={currencySymbol} />
            </Suspense>
          </BootstrapBoundary>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
        <SyncAdoptionModal />
        <PwaInstallPrompt />
        <AppToaster />
      </BrowserRouter>
    </AppProviders>
  );
}
