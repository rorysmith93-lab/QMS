// Roles are a fixed, code-defined set (not a per-company custom-role
// builder) — deliberately simple: three roles cover what's been asked
// for, and adding a fourth or reshuffling who sees what is a one-line
// change here, not a schema migration.
export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "quality_manager", label: "Quality Manager" },
  { value: "member", label: "Member" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

export function roleLabel(value: string) {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

export function isAdmin(role: string) {
  return role === "admin";
}

// Every module gated by role, and which roles can see it. Anything not
// listed here defaults to open to everyone — this table is only for the
// modules that are actually restricted.
const MODULE_ACCESS = {
  internalAudits: ["admin", "quality_manager"],
  managementReview: ["admin", "quality_manager"],
  qualityPolicy: ["admin", "quality_manager"],
  contextAndScope: ["admin", "quality_manager"],
  riskRegister: ["admin", "quality_manager"],
  supplierRegister: ["admin", "quality_manager"],
  authorization: ["admin", "quality_manager"],
  safetyAuthorization: ["admin", "quality_manager"],
  settings: ["admin"],
  team: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type ModuleKey = keyof typeof MODULE_ACCESS;

export function canAccess(role: string, moduleKey: ModuleKey): boolean {
  return (MODULE_ACCESS[moduleKey] as readonly string[]).includes(role);
}
