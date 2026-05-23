import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, homeFor } from "@/lib/auth-context";
import { login as apiLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { startGoogleSignIn } from "@/lib/google-oauth";
import { Button, Input, Field } from "@/components/ui";

export function Login() {
  const { status, user, error: authError, clearError, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The Google OAuth exchange is handled in AuthProvider; surface its error here.
  const error = formError ?? authError;

  // Already signed in → bounce home.
  useEffect(() => {
    if (status === "authenticated" && user) navigate(homeFor(user.role), { replace: true });
  }, [status, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    clearError();
    setBusy(true);
    try {
      const pair = await apiLogin(email, password);
      await signIn(pair);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-7 shadow-sm">
        <div className="mb-6 text-center text-xl font-bold tracking-tight">
          <span className="text-brand-navy">KlinikVoice</span>{" "}
          <span className="text-brand-cyan">AI</span>
          <p className="mt-1 text-sm font-normal text-muted">Admin dashboard</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <Button className="w-full" variant="secondary" loading={busy} onClick={() => startGoogleSignIn()}>
          <GoogleGlyph />
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
