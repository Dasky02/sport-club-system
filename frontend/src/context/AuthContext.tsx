"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, authLogin, authLogout, getMe } from "../api/api";
import { mapErrorToMessage } from "../api/errorMapper";
import type { LoginRequest } from "../api/types";
import type { AuthContextValue, AuthState } from "./AuthContextTypes";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, loading: true, initialized: false, sessionError: null,
  });
  const sequence = useRef(0);

  const loadUser = useCallback(async (ticket: number) => {
    try {
      const user = await getMe();
      if (ticket === sequence.current) {
        setState({ user, loading: false, initialized: true, sessionError: null });
      }
    } catch (error: unknown) {
      if (ticket !== sequence.current) return;
      if (error instanceof ApiError && error.status === 401) {
        setState({ user: null, loading: false, initialized: true, sessionError: null });
      } else {
        setState((previous) => ({
          ...previous, loading: false, initialized: true, sessionError: mapErrorToMessage(error),
        }));
      }
    }
  }, []);

  useEffect(() => {
    const ticket = ++sequence.current;
    void loadUser(ticket);
    return () => { sequence.current += 1; };
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    const ticket = ++sequence.current;
    setState((previous) => ({ ...previous, loading: true, sessionError: null }));
    await loadUser(ticket);
  }, [loadUser]);

  const login = useCallback(async (request: LoginRequest) => {
    const ticket = ++sequence.current;
    setState((previous) => ({ ...previous, loading: true }));
    try {
      const user = await authLogin(request);
      if (ticket === sequence.current) {
        setState({ user, loading: false, initialized: true, sessionError: null });
      }
    } catch (error: unknown) {
      if (ticket === sequence.current) setState((previous) => ({ ...previous, loading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const ticket = ++sequence.current;
    setState((previous) => ({ ...previous, loading: true }));
    try {
      await authLogout();
      if (ticket === sequence.current) {
        setState({ user: null, loading: false, initialized: true, sessionError: null });
      }
    } catch (error: unknown) {
      // Výpadek nezaručuje invalidaci serverové session; uživatele lokálně nevydáváme za odhlášeného.
      if (ticket === sequence.current) setState((previous) => ({ ...previous, loading: false }));
      throw error;
    }
  }, []);

  return <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth musí být použit uvnitř AuthProvider");
  return context;
}
