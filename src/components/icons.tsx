// Icons for the sidebar nav — rendered from Google's Material Symbols
// icon font (see the stylesheet link in the root layout + the
// .material-symbols-outlined base rule in globals.css) rather than
// hand-drawn SVG. Each export below is just that font's ligature for a
// given icon name, wrapped so every call site can keep using it exactly
// like a component (<HomeIcon />), unchanged from before.
import type { HTMLAttributes, SVGProps } from "react";

function materialIcon(glyphName: string) {
  function Icon({ className = "", style, ...rest }: HTMLAttributes<HTMLSpanElement>) {
    return (
      <span
        aria-hidden="true"
        className={`material-symbols-outlined ${className}`.trim()}
        style={{ fontSize: 20, ...style }}
        {...rest}
      >
        {glyphName}
      </span>
    );
  }
  return Icon;
}

export const HomeIcon = materialIcon("home");
export const DocumentIcon = materialIcon("description");
export const AlertIcon = materialIcon("warning");
export const ChecklistIcon = materialIcon("checklist");
export const SettingsIcon = materialIcon("settings");
export const LogoutIcon = materialIcon("logout");
export const SunIcon = materialIcon("light_mode");
export const MoonIcon = materialIcon("dark_mode");
export const AuditIcon = materialIcon("fact_check");
export const ReviewIcon = materialIcon("rate_review");
export const TargetIcon = materialIcon("target");
export const GraduationCapIcon = materialIcon("school");
export const SidebarCollapseIcon = materialIcon("left_panel_close");
export const SidebarExpandIcon = materialIcon("left_panel_open");
export const SearchIcon = materialIcon("search");
export const UserIcon = materialIcon("person");
export const WrenchIcon = materialIcon("build");
export const MenuIcon = materialIcon("menu");
export const SopIcon = materialIcon("article");
export const AuthorizationIcon = materialIcon("verified_user");
export const SafetyIcon = materialIcon("health_and_safety");
export const GavelIcon = materialIcon("gavel");
export const ReportIcon = materialIcon("emergency_home");
export const HazardIcon = materialIcon("report_problem");
export const BalanceIcon = materialIcon("balance");
export const SupplierIcon = materialIcon("local_shipping");
export const ContextIcon = materialIcon("public");

// Kept as hand-drawn SVG — unused anywhere in the app currently (not part
// of "the menu"), so there's nothing to convert.
export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="3.5" width="14" height="17" rx="1" />
      <path d="M9 7.5h1M14 7.5h1M9 11h1M14 11h1M9 14.5h1M14 14.5h1" />
      <path d="M10.5 20.5v-3a1.5 1.5 0 0 1 3 0v3" />
    </svg>
  );
}
