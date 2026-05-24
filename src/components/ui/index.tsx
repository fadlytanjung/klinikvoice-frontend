import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

// ── Button ──────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand-navy text-white hover:bg-brand-navy-700",
  secondary: "border border-line bg-white text-ink hover:bg-canvas",
  ghost: "text-ink hover:bg-canvas",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }
>(({ variant = "primary", loading, className, children, disabled, ...rest }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan",
      "disabled:cursor-not-allowed disabled:opacity-50",
      variants[variant],
      className,
    )}
    {...rest}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
));
Button.displayName = "Button";

// ── Input / Textarea ──────────────────────────────────────────────────────────
const fieldBase =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...rest} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-[88px]", className)} {...rest} />
  ),
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-card border border-line bg-white p-5", className)}>{children}</div>
  );
}

// ── Switch ──────────────────────────────────────────────────────────────────────
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-cyan" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-canvas text-muted",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-brand-cyan-50 text-brand-cyan-600",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

// ── Spinner / states ────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted", className)} />;
}

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <Spinner className="h-8 w-8 text-brand-cyan" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-card border border-dashed border-line p-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-card bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ── Confirm dialog ──────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "primary",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm text-muted">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
