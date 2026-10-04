import { useContext } from 'react';
import { AppBootstrapContext } from '../context/AppBootstrapContext';

export function useAppBootstrap() {
  const context = useContext(AppBootstrapContext);

  if (!context) {
    throw new Error('useAppBootstrap must be used within AppProviders.');
  }

  return context;
}
