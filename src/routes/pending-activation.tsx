import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

export function PendingActivation() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-7 text-center">
        <h1 className="text-xl font-semibold text-ink">Account pending activation</h1>
        <p className="mt-2 text-sm text-muted">
          Your registration was received. A KlinikVoice administrator needs to activate your
          clinic before you can sign in. You&apos;ll be able to log in once that&apos;s done.
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => void signOut()}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
