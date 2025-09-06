"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { accessToken: newToken } = await api.refresh();
      setAccessToken(newToken);
      const me = await api.me(newToken);
      setUser(me.user);
      return true;
    } catch (e) {
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  useEffect(() => {
    // Hydrate session on mount
    (async () => {
      setLoading(true);
      await refreshSession();
      setLoading(false);
    })();
  }, [refreshSession]);

  const value = useMemo(() => ({ user, accessToken, setUser, setAccessToken, refreshSession, logout, loading }), [user, accessToken, refreshSession, logout, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
