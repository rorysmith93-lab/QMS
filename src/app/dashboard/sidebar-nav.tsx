"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ReactNode };

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Closes the mobile nav drawer whenever the route changes — without
  // this, tapping a link would navigate but leave the drawer covering
  // the new page. Harmless on desktop, where the drawer state is unused.
  useEffect(() => {
    document.documentElement.setAttribute("data-mobile-nav", "closed");
  }, [pathname]);

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active
                ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                : "text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.icon}
            <span className="sidebar-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
