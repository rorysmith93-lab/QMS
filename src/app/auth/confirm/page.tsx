// Landing page for a link Supabase emailed — confirming a new sign-up, or
// resetting a forgotten password. Deliberately does NOT verify the link
// just by loading this page (see confirmEmailLink in ../actions.ts for
// why) — it only happens once someone actually clicks "Continue" below.
import { confirmEmailLink } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  const isRecovery = type === "recovery";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle iconOnly />
      </div>
      <div className="surface w-full max-w-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {isRecovery ? "Reset your password" : "Confirm your email"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isRecovery
            ? "Click below to continue and choose a new password."
            : "Click below to confirm your email and finish setting up your account."}
        </p>

        <form action={confirmEmailLink} className="mt-6">
          <input type="hidden" name="token_hash" value={token_hash ?? ""} />
          <input type="hidden" name="type" value={type ?? ""} />
          <button type="submit" className="btn-primary w-full">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
