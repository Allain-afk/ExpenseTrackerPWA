import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './context/AppProviders';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useSettings } from './hooks/useSettings';
import { AppShell } from './components/layout/AppShell';
import { SplashScreen } from './screens/SplashScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GroupDetailScreen } from './screens/GroupDetailScreen';
import { ManageWalletsScreen } from './screens/ManageWalletsScreen';
import { TransactionFormScreen } from './screens/TransactionFormScreen';
import { GroupFormScreen } from './screens/GroupFormScreen';
import { WalletFormScreen } from './screens/WalletFormScreen';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

function BootstrapBoundary({
  children,
  requireSetup,
}: {
  children: ReactNode;
  requireSetup?: boolean;
}) {
  const { bootstrap, bootstrapError, hasBootstrapped, isBootstrapping } = useAppBootstrap(true);
  const { isSetupComplete } = useSettings();

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

  if (requireSetup && !isSetupComplete) {
    return <Navigate replace to="/setup" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
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
            <GroupFormScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/groups/:groupId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <GroupFormScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <BootstrapBoundary requireSetup>
            <GroupDetailScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <BootstrapBoundary requireSetup>
            <TransactionFormScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/transactions/:transactionId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <TransactionFormScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets"
        element={
          <BootstrapBoundary requireSetup>
            <ManageWalletsScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets/new"
        element={
          <BootstrapBoundary requireSetup>
            <WalletFormScreen />
          </BootstrapBoundary>
        }
      />
      <Route
        path="/wallets/:walletId/edit"
        element={
          <BootstrapBoundary requireSetup>
            <WalletFormScreen />
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
        <PwaInstallPrompt />
      </BrowserRouter>
    </AppProviders>
  );
}
