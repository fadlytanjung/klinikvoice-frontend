import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  storeTokens,
  clearTokens,
  getRefreshToken,
  setOnAuthLost,
  ApiError,
} from "@/lib/api/client";
import { me as fetchMe, logout as apiLogout } from "@/lib/api/auth";
import { readGoogleCallback, exchangeGoogleCode } from "@/lib/google-oauth";
import type { Me, Role, TokenPair } from "@/types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: Me | null;
  /** Auth error to surface on the login screen (e.g. pending_activation). */
  error: string | null;
  clearError: () => void;
  signIn: (pair: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function homeFor(role: Role): string {
  return role === "superadmin" ? "/superadmin/tenants" : "/";
}

// Captured ONCE at module load — before React renders or any effect can strip
// the URL. This is the reliable signal that we arrived on a Google OAuth
// redirect; reading window.location later is racy (child effects strip it
// before the provider's effect runs).
const INITIAL_GOOGLE_CALLBACK =
  typeof window !== "undefined" &&
  (() => {
    const p = new URLSearchParams(window.location.search);
    return p.has("code") || p.has("error");
  })();

const ERROR_COPY: Record<string, string> = {
  pending_activation: "Your account is awaiting activation by an administrator.",
  calendar_consent_required: "Please allow Google Calendar access to continue.",
  invalid_google_token: "Google sign-in failed. Please try again.",
  invalid_google_code: "Google sign-in failed. Please try again.",
  refresh_token_invalid: "Google sign-in failed. Please try again.",
  access_denied: "Google sign-in was cancelled.",
  state_mismatch: "Sign-in expired. Please try again.",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    try {
      const u = await fetchMe();
      setUser(u);
      setStatus("authenticated");
    } catch {
      clearTokens();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const signIn = useCallback(
    async (pair: TokenPair) => {
      storeTokens(pair);
      await hydrate();
    },
    [hydrate],
  );

  // Boot: resolve the session exactly once.
  //  1. Google OAuth redirect (?code) → exchange server-side, then signIn.
  //     Stay "loading" throughout so routing shows a spinner, never the login
  //     form. We deliberately do NOT touch any stale refresh token here.
  //  2. Otherwise, if a refresh token exists → hydrate (/me, refreshing if 401).
  //  3. Otherwise → unauthenticated.
  useEffect(() => {
    if (INITIAL_GOOGLE_CALLBACK) {
      const cb = readGoogleCallback(); // returns the code once, then null (URL stripped)
      if (cb && "code" in cb) {
        exchangeGoogleCode(cb.code)
          .then(signIn)
          .catch((e: unknown) => {
            const code = e instanceof ApiError ? e.code : "";
            setError(ERROR_COPY[code] ?? "Google sign-in is not available yet.");
            clearTokens();
            setStatus("unauthenticated");
          });
        return;
      }
      if (cb && "error" in cb) {
        setError(ERROR_COPY[cb.error] ?? "Google sign-in failed.");
        setStatus("unauthenticated");
        return;
      }
      // StrictMode second run (URL already stripped): exchange is in flight.
      return;
    }

    if (getRefreshToken()) {
      void hydrate();
    } else {
      setStatus("unauthenticated");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a refresh fails mid-session, drop to unauthenticated.
  useEffect(() => {
    setOnAuthLost(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => setOnAuthLost(null);
  }, []);

  const signOut = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) await apiLogout(rt).catch(() => undefined);
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ status, user, error, clearError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
