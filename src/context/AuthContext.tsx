import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';

export interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  authError: string | null;
  user: User | null;
  session: Session | null;
  signUpWithPassword: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  syncDisplayName: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication failed.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(getErrorMessage(error));
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setAuthError(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signUpWithPassword(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      setAuthError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.',
      );
      return;
    }

    setAuthError(null);
    const cleanDisplayName = displayName?.trim();
    const metadata = cleanDisplayName
      ? {
          display_name: cleanDisplayName,
          full_name: cleanDisplayName,
          name: cleanDisplayName,
        }
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: metadata
        ? {
            data: metadata,
          }
        : undefined,
    });
    if (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function signInWithPassword(email: string, password: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      setAuthError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.',
      );
      return;
    }

    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function syncDisplayName(displayName: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const cleanDisplayName = displayName.trim();
    if (!cleanDisplayName) {
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: cleanDisplayName,
        full_name: cleanDisplayName,
        name: cleanDisplayName,
      },
    });

    if (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function signOut(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      authError,
      user,
      session,
      signUpWithPassword,
      signInWithPassword,
      syncDisplayName,
      signOut,
      clearAuthError: () => setAuthError(null),
    }),
    [authError, isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
