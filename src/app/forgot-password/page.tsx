import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>

        {error && (
          <p role="alert" className="banner-error mt-4">
            {error}
          </p>
        )}

        <form action={requestPasswordReset} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field mt-1"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="link-brand">
            ← Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
