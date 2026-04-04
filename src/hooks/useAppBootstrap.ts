import { useContext, useEffect, useRef } from 'react';
import { AppBootstrapContext } from '../context/AppBootstrapContext';

export function useAppBootstrap(autoStart = false) {
  const context = useContext(AppBootstrapContext);
  const hasAutoStartedRef = useRef(false);

  if (!context) {
    throw new Error('useAppBootstrap must be used within AppProviders.');
  }

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    void context.bootstrap();
  }, [autoStart, context.bootstrap]);

  return context;
}
