import type { ReactNode } from 'react';
import { Suspense, lazy, startTransition, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  MdAdd,
  MdFolder,
  MdFolderOpen,
  MdHome,
  MdListAlt,
  MdSettings,
} from 'react-icons/md';
import type { AppTab } from '../../types/models';
import { Modal } from '../common/Modal';
import { useExpenseGroups } from '../../hooks/useExpenseGroups';
import { useSettings } from '../../hooks/useSettings';
import { HomeScreen } from '../../screens/HomeScreen';
import styles from './AppShell.module.css';

const TransactionsScreen = lazy(async () => {
  const module = await import('../../screens/TransactionsScreen');
  return { default: module.TransactionsScreen };
});

const GroupsScreen = lazy(async () => {
  const module = await import('../../screens/GroupsScreen');
  return { default: module.GroupsScreen };
});

const SettingsScreen = lazy(async () => {
  const module = await import('../../screens/SettingsScreen');
  return { default: module.SettingsScreen };
});

const tabs: AppTab[] = ['home', 'transactions', 'groups', 'settings'];

const tabConfig: Array<{ key: AppTab; label: string; icon: ReactNode }> = [
  { key: 'home', label: 'Home', icon: <MdHome size={24} /> },
  { key: 'transactions', label: 'Transactions', icon: <MdListAlt size={24} /> },
  { key: 'groups', label: 'Categories', icon: <MdFolder size={24} /> },
  { key: 'settings', label: 'Settings', icon: <MdSettings size={24} /> },
];

export function AppShell() {
  const navigate = useNavigate();
  const params = useParams();
  const { groups } = useExpenseGroups();
  const { currencySymbol } = useSettings();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  const activeTab = tabs.includes((params.tab as AppTab) ?? 'home')
    ? ((params.tab as AppTab) ?? 'home')
    : null;

  if (!activeTab) {
    return <Navigate replace to="/app/home" />;
  }

  function goToTab(tab: AppTab) {
    startTransition(() => {
      navigate(`/app/${tab}`);
    });
  }

  function renderActiveTab() {
    if (activeTab === 'home') {
      return <HomeScreen currencySymbol={currencySymbol} />;
    }

    if (activeTab === 'transactions') {
      return <TransactionsScreen currencySymbol={currencySymbol} />;
    }

    if (activeTab === 'groups') {
      return <GroupsScreen currencySymbol={currencySymbol} />;
    }

    return <SettingsScreen />;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.screenStack}>
        <div className={styles.tabPanel}>
          <Suspense
            fallback={(
              <div className="app-page">
                <div className="app-card state-card">
                  <div className="spinner" aria-hidden="true" />
                  <h1>Loading section...</h1>
                  <p>Please wait while the tab view is prepared.</p>
                </div>
              </div>
            )}
          >
            {renderActiveTab()}
          </Suspense>
        </div>
      </div>

      <div className={styles.dockWrap}>
        <nav aria-label="Primary" className={styles.dock}>
          {tabConfig.slice(0, 2).map((tab) => (
            <button
              className={`${styles.dockButton} ${activeTab === tab.key ? styles.dockButtonActive : ''}`}
              key={tab.key}
              onClick={() => goToTab(tab.key)}
              type="button"
            >
              {tab.icon}
              <span className={styles.dockLabel}>{tab.label}</span>
            </button>
          ))}
          <button
            aria-label="Add transaction"
            className={styles.addButton}
            onClick={() => setIsAddSheetOpen(true)}
            type="button"
          >
            <MdAdd size={28} />
          </button>
          {tabConfig.slice(2).map((tab) => (
            <button
              className={`${styles.dockButton} ${activeTab === tab.key ? styles.dockButtonActive : ''}`}
              key={tab.key}
              onClick={() => goToTab(tab.key)}
              type="button"
            >
              {tab.icon}
              <span className={styles.dockLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <aside aria-label="Primary" className={styles.rail}>
        <div className={styles.railBrand}>
          <span className={styles.railBrandMark} aria-hidden="true">$</span>
          <span className={styles.railBrandName}>Expense Tracker</span>
        </div>
        <nav className={styles.railNav}>
          {tabConfig.map((tab) => (
            <button
              className={`${styles.railButton} ${activeTab === tab.key ? styles.railButtonActive : ''}`}
              key={tab.key}
              onClick={() => goToTab(tab.key)}
              type="button"
            >
              <span className={styles.railIcon}>{tab.icon}</span>
              <span className={styles.railLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>
        <button
          aria-label="Add transaction"
          className={styles.railAdd}
          onClick={() => setIsAddSheetOpen(true)}
          type="button"
        >
          <span className={styles.railAddIcon}>
            <MdAdd size={22} />
          </span>
          <span className={styles.railLabel}>Add</span>
        </button>
      </aside>

      <Modal
        description="Create a general transaction or add one directly into a category."
        onClose={() => setIsAddSheetOpen(false)}
        open={isAddSheetOpen}
        title="Add Transaction"
        variant="sheet"
      >
        <div className="stack-form">
          <Link className="inset-item" onClick={() => setIsAddSheetOpen(false)} to="/transactions/new">
            <span className="icon-chip accent-chip">
              <MdAdd size={24} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Add to General</span>
              <span className="inset-subtitle">Transaction without a category</span>
            </span>
          </Link>

          <div className="row-spread" style={{ paddingInline: '0.25rem' }}>
            <div>
              <p className="eyebrow">Add to Category</p>
              <p className="helper-text">Pick an existing category or create a new one.</p>
            </div>
            <Link className="ghost-button" onClick={() => setIsAddSheetOpen(false)} to="/groups/new">
              Create New Category
            </Link>
          </div>

          {groups.length ? (
            <div className={styles.sheetGroupList}>
              {groups.map((group) => (
                <Link
                  className="inset-item"
                  key={group.id}
                  onClick={() => setIsAddSheetOpen(false)}
                  to={`/transactions/new?groupId=${group.id}`}
                >
                  <span className="icon-chip accent-chip">
                    <MdFolder size={22} />
                  </span>
                  <span className="inset-item-content">
                    <span className="inset-title">{group.name}</span>
                    <span className="inset-subtitle">{group.description || 'No description'}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-card empty-state">
              <MdFolderOpen className="muted" size={40} style={{ marginInline: 'auto' }} />
              <h3 style={{ marginTop: '0.75rem' }}>No categories yet</h3>
              <p>Create your first category to organize expenses.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
