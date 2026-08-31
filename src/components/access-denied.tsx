import Link from "next/link";

// Rendered by any page a role isn't permitted to view — this is the
// actual enforcement (checked server-side before any data for the page is
// even fetched), not just a hidden sidebar link, so navigating straight
// to the URL is blocked exactly the same way.
export function AccessDenied() {
  return (
    <div className="surface mx-auto mt-12 max-w-md p-8 text-center">
      <p className="text-sm text-[var(--text-primary)]">Your role doesn&apos;t have access to this section.</p>
      <p className="mt-1 text-xs text-faint">Ask an admin if you think this is wrong.</p>
      <Link href="/dashboard" className="mt-4 inline-block link-brand text-sm">
        ← Back to dashboard
      </Link>
    </div>
  );
}
