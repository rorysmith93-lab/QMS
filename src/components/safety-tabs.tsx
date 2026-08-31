import Link from "next/link";

// The Safety area used to be 5 separate top-level nav entries (Safety,
// Incidents, Legal Register, Risk Assessments, Safety Documents) — all
// really one area, all already living under /dashboard/safety/*. Folded
// into tabs on a single "Safety" nav item instead, same trick as
// Equipment/Infrastructure, so the sidebar only needs the one entry.
export function SafetyTabs({
  active,
}: {
  active: "overview" | "incidents" | "legal-register" | "risk-assessments" | "documents";
}) {
  const tabs = [
    { key: "overview", label: "Overview", href: "/dashboard/safety" },
    { key: "incidents", label: "Incidents", href: "/dashboard/safety/incidents" },
    { key: "risk-assessments", label: "Risk Assessments", href: "/dashboard/safety/risk-assessments" },
    { key: "legal-register", label: "Legal Register", href: "/dashboard/safety/legal-register" },
    { key: "documents", label: "Documents", href: "/dashboard/safety/documents" },
  ] as const;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: isActive ? "var(--brand)" : "var(--border)",
              backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
