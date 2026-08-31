import Link from "next/link";
import { login } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage({
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
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Log in</h1>
        <p className="mt-1 text-sm text-muted">Welcome back to QMS Rapid.</p>

        {error && (
          <p role="alert" className="banner-error mt-4">
            {error}
          </p>
        )}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
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

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Password
              </label>
              <Link href="/forgot-password" className="link-brand text-xs">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field mt-1"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="link-brand">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
