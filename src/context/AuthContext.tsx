import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../services/api';
import type { Permission, User } from '../types/kanban';

type AuthState = {
  user: User | null;
  scopes: Permission[] | null;
  permissions: Permission[];
  loading: boolean;
  needsSetup: boolean;
  error: string | null;
  can: (perm: Permission) => boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (input: {
    name: string;
    email: string;
    password: string;
    setupToken?: string;
  }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [scopes, setScopes] = useState<Permission[] | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAuth = () => {
    setUser(null);
    setScopes(null);
    setPermissions([]);
  };

  const applyMe = (me: {
    user: User;
    scopes: Permission[] | null;
    permissions?: Permission[];
  }) => {
    setUser(me.user);
    setScopes(me.scopes);
    setPermissions(me.permissions ?? []);
  };

  const refresh = useCallback(async () => {
    try {
      const status = await api.setupStatus();
      if (status.needsSetup) {
        setNeedsSetup(true);
        clearAuth();
        return;
      }
      setNeedsSetup(false);
      const me = await api.me();
      applyMe(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearAuth();
      } else if (e instanceof TypeError) {
        setError(
          'Cannot reach API. Check that the backend is running and the Vite proxy target is correct.'
        );
        clearAuth();
      } else {
        clearAuth();
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    setError(null);
    await api.login({ email, password });
    const me = await api.me();
    applyMe(me);
    setNeedsSetup(false);
  };

  const setup = async (input: {
    name: string;
    email: string;
    password: string;
    setupToken?: string;
  }) => {
    setError(null);
    await api.setup(input);
    const me = await api.me();
    applyMe(me);
    setNeedsSetup(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.changePassword({ currentPassword, newPassword });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Still clear client state, but surface failures so a stuck cookie is visible.
      if (e instanceof ApiError) {
        setError(e.message);
      }
    } finally {
      clearAuth();
    }
  };

  const canFn = useCallback((perm: Permission) => permissions.includes(perm), [permissions]);

  const value = useMemo(
    () => ({
      user,
      scopes,
      permissions,
      loading,
      needsSetup,
      error,
      can: canFn,
      login,
      setup,
      changePassword,
      logout,
      refresh,
    }),
    [user, scopes, permissions, loading, needsSetup, error, canFn, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
