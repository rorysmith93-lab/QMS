export const PARTY_CATEGORIES = [
  { value: "customer", label: "Customer" },
  { value: "regulator", label: "Regulator / Certification Body" },
  { value: "supplier", label: "Supplier" },
  { value: "owner", label: "Owner / Shareholder" },
  { value: "employee", label: "Employee" },
  { value: "community", label: "Community / Environment" },
  { value: "other", label: "Other" },
] as const;

export function partyCategoryLabel(value: string) {
  return PARTY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
