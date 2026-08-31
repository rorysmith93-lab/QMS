import { updatePassword } from "@/app/auth/actions";
import { requireProfile } from "@/lib/current-profile";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Only reachable with a valid session — either from clicking a genuine
  // password-reset email link (which logs you in as part of verifying
  // it), or from being already logged in. No session just bounces to
  // /login, same as every other page under here.
  await requireProfile();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">Choose something you haven&apos;t used before.</p>

        {error && (
          <p role="alert" className="banner-error mt-4">
            {error}
          </p>
        )}

        <form action={updatePassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)]">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="field mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="field mt-1"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
