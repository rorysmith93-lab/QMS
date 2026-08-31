import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordCheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for that address, we&apos;ve sent a link to reset your password.
          Click it to choose a new one.
        </p>
      </div>
    </div>
  );
}
