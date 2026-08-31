import Link from "next/link";

// The Equipment area covers two different things under one nav item, so
// the nav bar doesn't need a separate entry for each: WI-linkable tools
// (with calibration tracking, clause 7.1.5) and the broader infrastructure
// register — buildings, IT, production machinery, vehicles (clause 7.1.3).
// Same pill-tab styling as the status filters elsewhere (e.g. Risk
// Register, Change Control).
export function EquipmentTabs({ active }: { active: "equipment" | "infrastructure" }) {
  const tabs = [
    { key: "equipment", label: "Tools & Equipment", href: "/dashboard/equipment" },
    { key: "infrastructure", label: "Infrastructure & Assets", href: "/dashboard/equipment/infrastructure" },
  ] as const;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
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
