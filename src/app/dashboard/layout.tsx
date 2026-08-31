import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/auth/actions";
import { requireProfile } from "@/lib/current-profile";
import { DEFAULT_BRAND_COLOR, isValidHexColor } from "@/lib/color";
import { DEFAULT_FONT_ID, fontCssValue } from "@/lib/fonts";
import { SidebarNav } from "@/app/dashboard/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarCollapseToggle } from "@/components/sidebar-collapse-toggle";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { MobileNavBackdrop } from "@/components/mobile-nav-backdrop";
import { CommandPalette } from "@/components/command-palette";
import { canAccess, type ModuleKey } from "@/lib/roles";
import {
  AlertIcon,
  AuditIcon,
  AuthorizationIcon,
  BalanceIcon,
  ChangeControlIcon,
  ChecklistIcon,
  CommunicationsIcon,
  ContextIcon,
  DocumentIcon,
  GavelIcon,
  GraduationCapIcon,
  HazardIcon,
  HomeIcon,
  LogoutIcon,
  ReportIcon,
  ReviewIcon,
  SafetyIcon,
  SettingsIcon,
  SopIcon,
  SupplierIcon,
  TargetIcon,
  UserIcon,
  WrenchIcon,
} from "@/components/icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, supabase } = await requireProfile();

  const companyName = profile.companies?.name ?? "Your company";
  const brandColor =
    profile.companies?.primary_color && isValidHexColor(profile.companies.primary_color)
      ? profile.companies.primary_color
      : DEFAULT_BRAND_COLOR;

  const fontFamily = profile.companies?.font_family || DEFAULT_FONT_ID;

  const logoUrl = profile.companies?.logo_path
    ? supabase.storage.from("logos").getPublicUrl(profile.companies.logo_path).data.publicUrl
    : null;

  // `module` is optional — only the items actually gated by role carry
  // one (see src/lib/roles.ts). Everything else is open to every role.
  // Dashboard and My Items stay pinned at the top (most-used, orientation
  // items), Settings stays pinned at the bottom (least-used, admin-only)
  // — everything else in between is plain alphabetical by label, so a
  // newly added module lands in a predictable spot without needing to
  // think about where to insert it.
  const allNavItems: { href: string; label: string; icon: React.ReactNode; module?: ModuleKey }[] = [
    { href: "/dashboard", label: "Dashboard", icon: <HomeIcon /> },
    { href: "/dashboard/my-items", label: "My Items", icon: <UserIcon /> },
    { href: "/dashboard/authorization", label: "Authorization", icon: <AuthorizationIcon />, module: "authorization" },
    { href: "/dashboard/change-control", label: "Change Control", icon: <ChangeControlIcon />, module: "changeControl" },
    { href: "/dashboard/communications", label: "Communications", icon: <CommunicationsIcon />, module: "communications" },
    { href: "/dashboard/context", label: "Context & Scope", icon: <ContextIcon />, module: "contextAndScope" },
    { href: "/dashboard/documents", label: "Documents", icon: <DocumentIcon /> },
    { href: "/dashboard/equipment", label: "Equipment", icon: <WrenchIcon /> },
    { href: "/dashboard/safety/incidents", label: "Incidents", icon: <ReportIcon /> },
    { href: "/dashboard/internal-audits", label: "Internal Audits", icon: <AuditIcon />, module: "internalAudits" },
    { href: "/dashboard/safety/legal-register", label: "Legal Register", icon: <GavelIcon /> },
    { href: "/dashboard/management-reviews", label: "Management Review", icon: <ReviewIcon />, module: "managementReview" },
    { href: "/dashboard/non-conformances", label: "Non-Conformances", icon: <AlertIcon /> },
    { href: "/dashboard/quality-policy", label: "Quality Policy", icon: <TargetIcon /> },
    { href: "/dashboard/safety/risk-assessments", label: "Risk Assessments", icon: <HazardIcon /> },
    { href: "/dashboard/risk-register", label: "Risk Register", icon: <BalanceIcon />, module: "riskRegister" },
    { href: "/dashboard/safety", label: "Safety", icon: <SafetyIcon /> },
    { href: "/dashboard/safety/documents", label: "Safety Documents", icon: <DocumentIcon /> },
    { href: "/dashboard/sops", label: "SOPs", icon: <SopIcon /> },
    { href: "/dashboard/suppliers", label: "Suppliers", icon: <SupplierIcon />, module: "supplierRegister" },
    { href: "/dashboard/training", label: "Training", icon: <GraduationCapIcon /> },
    { href: "/dashboard/work-instructions", label: "Work Instructions", icon: <ChecklistIcon /> },
    { href: "/dashboard/settings", label: "Settings", icon: <SettingsIcon />, module: "settings" },
  ];

  const navItems = allNavItems.filter((item) => !item.module || canAccess(profile.role, item.module));

  return (
    // Setting --brand here overrides the site-wide default (see
    // globals.css) for everything inside the logged-in app, so buttons,
    // links, and focus rings all pick up the company's own colour.
    //
    // font-family needs its OWN explicit declaration here too, not just
    // the --font-sans custom property — font-family is an inherited CSS
    // property, and globals.css only reads var(--font-sans) once, on
    // <body>. Overriding the custom property alone at this depth changes
    // nothing, because body's font-family was already resolved (using
    // the :root default) before this div is ever reached; declaring
    // font-family explicitly here, using the now-overridden variable,
    // is what actually gets the new font to cascade to everything below.
    <div
      className="flex min-h-screen"
      style={{
        ["--brand" as string]: brandColor,
        ["--font-sans" as string]: fontCssValue(fontFamily),
        fontFamily: "var(--font-sans)",
      }}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <MobileNavBackdrop />

      <aside
        className="sidebar-aside flex shrink-0 flex-col border-r px-3"
        style={{
          backgroundColor: "var(--sidebar)",
          borderColor: "var(--border)",
          // Same reasoning as the toggle button above — the drawer opens
          // full-height, edge to edge, so its header and footer both need
          // extra room for the notch/status bar up top and the home-
          // indicator swipe area at the bottom. Plain py-4 doesn't know
          // about either; both env() calls are 0 with no safe area.
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
      >
        <Link href="/dashboard" title={companyName} className="flex items-center gap-2 rounded-md px-2 py-1.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${companyName} logo`}
              width={84}
              height={28}
              unoptimized
              className="sidebar-logo shrink-0 object-contain"
            />
          ) : (
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--brand)" }}
              aria-hidden="true"
            >
              {companyName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="sidebar-label truncate text-sm font-semibold text-[var(--text-primary)]">
            {companyName}
          </span>
        </Link>

        <CommandPalette navItems={navItems.map(({ href, label }) => ({ href, label }))} />

        <div className="mt-6 flex-1">
          <SidebarNav items={navItems} />
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <SidebarCollapseToggle />
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              title="Log out"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <LogoutIcon />
              <span className="sidebar-label">Log out</span>
            </button>
          </form>
          <p className="sidebar-label mt-3 px-2.5 text-xs text-faint">QMS Rapid</p>
        </div>
      </aside>

      {/* overflow-y is only "auto" (its own independent scroll container)
          from md up, where the sidebar is a normal in-flow column that
          needs to stay in view while this scrolls separately. On mobile
          the sidebar is a fixed off-canvas drawer instead — it doesn't
          care how this scrolls, and letting the page/viewport itself
          scroll instead of a nested container avoids a real iOS Safari
          bug where a position:fixed element sitting alongside its own
          separately-scrolling sibling can stop responding to touches.
          Horizontal-overflow protection lives on <body> instead of here
          (see globals.css) — setting overflow-x here too, alongside
          overflow-y, would silently force overflow-y to compute as
          "auto" regardless of what it's set to (a real CSS overflow-spec
          quirk: one axis can't stay "visible" once the other isn't),
          undoing the very thing this comment explains. */}
      <main id="main-content" className="flex-1 px-4 pb-6 md:overflow-x-hidden md:overflow-y-auto md:px-8 md:py-10">
        {/* Full-width (the -mx-4 cancels out main's own px-4) sticky bar,
            mobile only — a normal in-flow element, not position:fixed, so
            it doesn't hit the iOS touch bug explained above. Sticks to
            the top of the page as it scrolls since the page/viewport
            itself is what scrolls now (see overflow-y-visible above). */}
        <div
          className="sticky top-0 z-30 -mx-4 mb-4 flex items-center border-b px-4 py-3 md:hidden"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border)",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          }}
        >
          <MobileNavToggle />
        </div>
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
