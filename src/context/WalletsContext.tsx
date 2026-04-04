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
    const maxSortOrder = wallets.reduce((max, currentWallet) => {
      return Math.max(max, Number(currentWallet.sortOrder ?? 0));
    }, -1);

    setWallets((previousWallets) => {
      const nextWallet: Wallet = {
        ...ownedWallet,
        id,
        sortOrder: maxSortOrder + 1,
      };

      return [...previousWallets, nextWallet];
    });
    return id;
  }

  async function updateWallet(wallet: Wallet): Promise<void> {
    await walletsRepository.updateWallet(wallet);

    setWallets((previousWallets) => {
      return previousWallets.map((previousWallet) => {
        if (previousWallet.id !== wallet.id) {
          return previousWallet;
        }

        return {
          ...previousWallet,
          ...wallet,
        };
      });
    });
  }

  async function reorderWallets(walletIds: number[]): Promise<void> {
    await walletsRepository.saveWalletOrder(walletIds);

    setWallets((previousWallets) => {
      const orderMap = new Map<number, number>();
      for (const [index, walletId] of walletIds.entries()) {
        orderMap.set(walletId, index);
      }

      return previousWallets
        .map((wallet) => {
          if (typeof wallet.id !== 'number') {
            return wallet;
          }

          const nextOrder = orderMap.get(wallet.id);
          if (typeof nextOrder !== 'number') {
            return wallet;
          }

          return {
            ...wallet,
            sortOrder: nextOrder,
          };
        })
        .sort((left, right) => {
          const leftOrder = Number(left.sortOrder ?? 0);
          const rightOrder = Number(right.sortOrder ?? 0);
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return Number(left.id ?? 0) - Number(right.id ?? 0);
        });
    });
  }

  async function deleteWallet(walletId: number): Promise<void> {
    await walletsRepository.deleteWallet(walletId);

    setWallets((previousWallets) => {
      return previousWallets.filter((wallet) => wallet.id !== walletId);
    });

    transactionsContext?.clearTransactionsForWallet(walletId);
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
