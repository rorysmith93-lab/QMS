import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Create your company account
        </h1>
        <p className="mt-1 text-sm text-muted">
          This creates a private workspace for your company in QMS Rapid.
        </p>

        {error && (
          <p role="alert" className="banner-error mt-4">
            {error}
          </p>
        )}

        <form action={signup} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Company name
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              className="field mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Your name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="field mt-1"
            />
          </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Password
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

          <button type="submit" className="btn-primary w-full">
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="link-brand">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
