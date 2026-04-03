// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, type ApiUser } from '@/lib/api';

type LoginPayload = { email: string; password: string };
type LoginResponse = {
  user: ApiUser;
  access_token: string;
  refresh_token: string;
};

type AuthCtx = {
  user: ApiUser | null;
  loading: boolean;
  login: (p: LoginPayload) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidratar desde localStorage al cargar la app
  useEffect(() => {
    const u = tokenStore.getUser();
    if (u) setUser(u);
    setLoading(false);
  }, []);

  // Login
  async function login(p: LoginPayload) {
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', p);
      tokenStore.saveAll(data.user, data.access_token, data.refresh_token);
      setUser(data.user);
    } catch (err) {
      // Re-lanzar para que el caller pueda mostrar mensaje
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Logout
  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  const value = useMemo<AuthCtx>(() => ({ user, loading, login, logout }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider />');
  return ctx;
}
