import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AUTH_REQUIRED_EVENT,
  clearSession,
  isPortalOrigin,
  loadSession,
  pickPortalToken,
  requestPortalAuth,
  saveSession,
  toAuthUser,
  type AuthUser,
  type PortalSession,
  type PortalUser,
} from "./portal";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

type PortalAuthMessage = {
  type?: string;
  payload?: {
    user?: PortalUser | null;
    idToken?: string;
    accessToken?: string;
    token?: string;
    issuedAt?: number;
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const stopPing = useRef<() => void>(() => undefined);

  const startPing = useCallback((ms = 20_000) => {
    stopPing.current();
    stopPing.current = requestPortalAuth(ms);
  }, []);

  const applyToken = useCallback((session: PortalSession) => {
    saveSession(session);
    setUser(toAuthUser(session));
    setLoading(false);
    stopPing.current();
  }, []);

  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setUser(toAuthUser(existing));
      setLoading(false);
    } else {
      startPing(25_000);
    }

    const onMessage = (event: MessageEvent) => {
      if (!isPortalOrigin(event.origin)) return;
      const data = event.data as PortalAuthMessage;
      if (data?.type !== "portal-auth" || !data.payload?.user) return;
      const idToken = pickPortalToken(data.payload);
      if (!idToken) return;
      applyToken({
        user: data.payload.user,
        idToken,
        issuedAt: data.payload.issuedAt ?? Date.now(),
      });
    };

    const onNeedAuth = () => {
      clearSession();
      setUser(null);
      setLoading(true);
      startPing(25_000);
      window.setTimeout(() => setLoading(false), 8_000);
    };

    window.addEventListener("message", onMessage);
    window.addEventListener(AUTH_REQUIRED_EVENT, onNeedAuth);

    const expiryWatch = window.setInterval(() => {
      if (!loadSession()) {
        setUser((prev) => {
          if (prev) startPing(25_000);
          return prev ? null : prev;
        });
      }
    }, 20_000);

    return () => {
      stopPing.current();
      window.removeEventListener("message", onMessage);
      window.removeEventListener(AUTH_REQUIRED_EVENT, onNeedAuth);
      window.clearInterval(expiryWatch);
    };
  }, [applyToken, startPing]);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ user, loading, signOut }), [user, loading, signOut]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
