import { useContext, useEffect } from 'react';
import { AppBootstrapContext } from '../context/AppBootstrapContext';

export function useAppBootstrap(autoStart = false) {
  const context = useContext(AppBootstrapContext);

  if (!context) {
    throw new Error('useAppBootstrap must be used within AppProviders.');
  }

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    void context.bootstrap();
  }, [autoStart, context]);

  return context;
}
