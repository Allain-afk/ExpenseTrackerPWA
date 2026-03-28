import type { ReactNode } from 'react';
import { startTransition, useState } from 'react';
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
import { TransactionsScreen } from '../../screens/TransactionsScreen';
import { GroupsScreen } from '../../screens/GroupsScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import styles from './AppShell.module.css';

const tabs: AppTab[] = ['home', 'transactions', 'groups', 'settings'];

const tabConfig: Array<{ key: AppTab; label: string; icon: ReactNode }> = [
  { key: 'home', label: 'Home', icon: <MdHome size={24} /> },
  { key: 'transactions', label: 'Transactions', icon: <MdListAlt size={24} /> },
  { key: 'groups', label: 'Groups', icon: <MdFolder size={24} /> },
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

  return (
    <div className={styles.shell}>
      <div className={styles.screenStack}>
        <div className={activeTab === 'home' ? styles.tabPanel : styles.tabPanelHidden}>
          <HomeScreen currencySymbol={currencySymbol} />
        </div>
        <div className={activeTab === 'transactions' ? styles.tabPanel : styles.tabPanelHidden}>
          <TransactionsScreen currencySymbol={currencySymbol} />
        </div>
        <div className={activeTab === 'groups' ? styles.tabPanel : styles.tabPanelHidden}>
          <GroupsScreen currencySymbol={currencySymbol} />
        </div>
        <div className={activeTab === 'settings' ? styles.tabPanel : styles.tabPanelHidden}>
          <SettingsScreen />
        </div>
      </div>

      <div className={styles.dockWrap}>
        <nav className={styles.dock}>
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

      <Modal
        description="Create a general transaction or add one directly into a group."
        onClose={() => setIsAddSheetOpen(false)}
        open={isAddSheetOpen}
        title="Add Transaction"
        variant="sheet"
      >
        <div className="stack-form">
          <Link className="inset-item" onClick={() => setIsAddSheetOpen(false)} to="/transactions/new">
            <span className="icon-chip" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8' }}>
              <MdAdd size={24} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Add to General</span>
              <span className="inset-subtitle">Transaction without a group</span>
            </span>
          </Link>

          <div className="row-spread" style={{ paddingInline: '0.25rem' }}>
            <div>
              <p className="eyebrow">Add to Group</p>
              <p className="helper-text">Pick an existing group or create a new one.</p>
            </div>
            <Link className="ghost-button" onClick={() => setIsAddSheetOpen(false)} to="/groups/new">
              Create New Group
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
                  <span
                    className="icon-chip"
                    style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8' }}
                  >
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
              <h3 style={{ marginTop: '0.75rem' }}>No groups yet</h3>
              <p>Create your first group to organize expenses.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
