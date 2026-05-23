// Hand-written fetch client (frontend/docs/07 §3-§4).
// - prefixes /api/v1, attaches bearer token
// - single-flight 401 refresh + one retry
// - normalizes backend error shape into ApiError

import type { TokenPair } from "@/types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const REFRESH_KEY = "kv_refresh";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token state ──────────────────────────────────────────────────────────────
let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(t: string | null) {
  if (t) localStorage.setItem(REFRESH_KEY, t);
  else localStorage.removeItem(REFRESH_KEY);
}
export function storeTokens(pair: TokenPair) {
  setAccessToken(pair.access_token);
  setRefreshToken(pair.refresh_token);
}
export function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}
/** Register a callback fired when refresh fails — app uses it to redirect to /login. */
export function setOnAuthLost(cb: (() => void) | null) {
  onAuthLost = cb;
}

// ── Single-flight refresh ──────────────────────────────────────────────────────
let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return false;
    const pair = (await res.json()) as TokenPair;
    storeTokens(pair);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// ── Core request ────────────────────────────────────────────────────────────
async function raw(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  opts: { retryOn401?: boolean } = {},
): Promise<T> {
  const retryOn401 = opts.retryOn401 ?? true;
  let res = await raw(path, init);

  if (res.status === 401 && retryOn401 && getRefreshToken()) {
    const ok = await refreshOnce();
    if (ok) {
      res = await raw(path, init);
    } else {
      clearTokens();
      onAuthLost?.();
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const code = (data.code ?? data.detail ?? "ERROR") as string;
    const message = (data.error ?? data.detail ?? res.statusText) as string;
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

// Convenience verbs.
export const get = <T>(p: string) => api<T>(p, { method: "GET" });
export const post = <T>(p: string, body?: unknown) =>
  api<T>(p, { method: "POST", body: body == null ? undefined : JSON.stringify(body) });
export const patch = <T>(p: string, body?: unknown) =>
  api<T>(p, { method: "PATCH", body: body == null ? undefined : JSON.stringify(body) });
export const put = <T>(p: string, body?: unknown) =>
  api<T>(p, { method: "PUT", body: body == null ? undefined : JSON.stringify(body) });
export const del = <T>(p: string) => api<T>(p, { method: "DELETE" });
