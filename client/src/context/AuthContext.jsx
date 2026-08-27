import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchSession,
  login as loginRequest,
  logout as logoutRequest,
} from '../api/admin.js';
import { setActiveLocalId, setUnauthorizedHandler } from '../api/client.js';

const AuthContext = createContext(null);
const LOCAL_STORAGE_KEY = 'reserva-salas:activeLocalId';

function pickLocalId(locals, preferredId) {
  if (!locals?.length) return null;
  const preferred = locals.find((local) => local.id === Number(preferredId));
  return (preferred ?? locals[0]).id;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [locals, setLocals] = useState([]);
  const [localId, setLocalId] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session) => {
    const nextLocals = session?.locals ?? [];
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const nextLocalId = pickLocalId(nextLocals, stored);

    setUser(session?.user ?? null);
    setLocals(nextLocals);
    setLocalId(nextLocalId);
    setActiveLocalId(nextLocalId);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setLocals([]);
    setLocalId(null);
    setActiveLocalId(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    fetchSession()
      .then((session) => {
        if (!cancelled) applySession(session);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (username, password) => {
      const session = await loginRequest(username, password);
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearSession();
    }
  }, [clearSession]);

  const selectLocal = useCallback(
    (nextId) => {
      const id = Number(nextId);
      if (!locals.some((local) => local.id === id)) return;

      setLocalId(id);
      setActiveLocalId(id);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, String(id));
    },
    [locals]
  );

  const refreshLocals = useCallback(async () => {
    const session = await fetchSession();
    applySession(session);
  }, [applySession]);

  const value = useMemo(
    () => ({
      user,
      locals,
      localId,
      activeLocal: locals.find((local) => local.id === localId) ?? null,
      loading,
      isSuperadmin: user?.role === 'superadmin',
      isAdmin: user?.role === 'admin',
      login,
      logout,
      selectLocal,
      refreshLocals,
    }),
    [user, locals, localId, loading, login, logout, selectLocal, refreshLocals]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
