import { useContext } from 'react';
import { WalletsContext } from '../context/WalletsContext';

export function useWallets() {
  const context = useContext(WalletsContext);

  if (!context) {
    throw new Error('useWallets must be used within AppProviders.');
  }

  return context;
}
