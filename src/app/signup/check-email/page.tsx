import { ThemeToggle } from "@/components/theme-toggle";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;ve sent you a confirmation link. Click it to finish setting up
          your account, then come back and log in.
        </p>
      </div>
    </div>
  );
}
