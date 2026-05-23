// Google OAuth (authorization-code redirect flow).
//
// The backend /auth/google requires { id_token, refresh_token, scopes }. Those
// come from exchanging an auth `code` with Google's token endpoint, which needs
// the CLIENT SECRET — so the exchange MUST happen on the backend, never here
// (frontend/docs/07 §2 + §5 Q1). This module only:
//   1. redirects the user to Google's consent screen (calendar scope, offline), and
//   2. exposes the code captured on redirect-back for the backend to exchange.

import { post } from "@/lib/api/client";
import type { TokenPair } from "@/types";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
].join(" ");
const STATE_KEY = "kv_oauth_state";

function redirectUri(): string {
  // Must byte-match an "Authorized redirect URI" on the Google OAuth client.
  // We use the origin root (e.g. http://localhost:3000/) which is already
  // registered; the callback is intercepted at the root by App (the SPA reads
  // ?code/?state on load, then hands the code to the backend exchange).
  return `${window.location.origin}/`;
}

/** Send the browser to Google's consent screen. */
export function startGoogleSignIn() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not set");

  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  window.location.assign(`${GOOGLE_AUTH}?${params.toString()}`);
}

/** Read & validate the ?code=&state= Google appended on redirect-back. */
export function readGoogleCallback(): { code: string } | { error: string } | null {
  const url = new URL(window.location.href);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!error && !code) return null;

  // Clean the query so a reload doesn't re-trigger.
  window.history.replaceState({}, "", url.pathname);

  if (error) return { error };
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!state || state !== expected) return { error: "state_mismatch" };
  return { code: code! };
}

/**
 * Hand the auth code to the backend, which exchanges it with Google (using the
 * client secret), enforces calendar consent, persists tenant credentials, and
 * returns our TokenPair.
 *
 * ⚠️ Depends on a backend code-exchange endpoint that is not implemented yet
 * (frontend/docs/07 §5 Q1). Until it exists this call returns an ApiError that
 * the login page surfaces. Email/password login works independently.
 */
export function exchangeGoogleCode(code: string): Promise<TokenPair> {
  return post<TokenPair>("/auth/google/exchange", { code, redirect_uri: redirectUri() });
}
