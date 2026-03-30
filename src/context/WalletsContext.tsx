import { createContext, useContext, useState, type ReactNode } from 'react';
import { createWalletsRepository } from '../lib/db/repositories/walletsRepository';
import { databaseClient } from '../lib/db/client';
import type { Wallet } from '../types/models';
import { TransactionsContext } from './TransactionsContext';
import { AuthContext } from './AuthContext';

const walletsRepository = createWalletsRepository(databaseClient);

export interface WalletsContextValue {
  wallets: Wallet[];
  isLoaded: boolean;
  loadWallets: () => Promise<Wallet[]>;
  addWallet: (wallet: Wallet) => Promise<number>;
  updateWallet: (wallet: Wallet) => Promise<void>;
  reorderWallets: (walletIds: number[]) => Promise<void>;
  deleteWallet: (walletId: number) => Promise<void>;
  getWalletById: (walletId: number) => Wallet | undefined;
}

export const WalletsContext = createContext<WalletsContextValue | null>(null);

export function WalletsProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const transactionsContext = useContext(TransactionsContext);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  async function loadWallets(): Promise<Wallet[]> {
    const loadedWallets = await walletsRepository.getAllWallets();
    setWallets(loadedWallets);
    setIsLoaded(true);
    return loadedWallets;
  }

  async function addWallet(wallet: Wallet): Promise<number> {
    const ownedWallet: Wallet = {
      ...wallet,
      userId: authContext?.user?.id ?? wallet.userId ?? null,
    };

    const id = await walletsRepository.insertWallet(ownedWallet);
    await loadWallets();
    return id;
  }

  async function updateWallet(wallet: Wallet): Promise<void> {
    await walletsRepository.updateWallet(wallet);
    await loadWallets();
  }

  async function reorderWallets(walletIds: number[]): Promise<void> {
    await walletsRepository.saveWalletOrder(walletIds);
    await loadWallets();
  }

  async function deleteWallet(walletId: number): Promise<void> {
    await walletsRepository.deleteWallet(walletId);
    await loadWallets();
    await transactionsContext?.loadTransactions();
  }

  function getWalletById(walletId: number): Wallet | undefined {
    return wallets.find((wallet) => wallet.id === walletId);
  }

  return (
    <WalletsContext.Provider
      value={{
        wallets,
        isLoaded,
        loadWallets,
        addWallet,
        updateWallet,
        reorderWallets,
        deleteWallet,
        getWalletById,
      }}
    >
      {children}
    </WalletsContext.Provider>
  );
}
