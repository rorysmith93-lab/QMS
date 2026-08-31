// A fixed, curated catalog of PPE symbols — not something a company edits,
// just a standard list to pick from for a work instruction. Keep this in
// sync with the CHECK constraint in supabase/equipment_and_ppe_schema.sql.
export const PPE_ITEMS = [
  { key: "eye_protection", label: "Eye Protection" },
  { key: "ear_protection", label: "Ear Protection" },
  { key: "head_protection", label: "Head Protection" },
  { key: "hand_protection", label: "Hand Protection" },
  { key: "foot_protection", label: "Foot Protection" },
  { key: "hi_vis", label: "Hi-Vis Clothing" },
  { key: "respiratory_protection", label: "Respiratory Protection" },
  { key: "face_shield", label: "Face Shield" },
  { key: "protective_clothing", label: "Protective Clothing" },
  { key: "fall_protection", label: "Fall Protection" },
] as const;

export type PpeKey = (typeof PPE_ITEMS)[number]["key"];

const PPE_KEYS = new Set<string>(PPE_ITEMS.map((p) => p.key));

export function isPpeKey(value: string): value is PpeKey {
  return PPE_KEYS.has(value);
}

export function ppeLabel(key: string): string {
  return PPE_ITEMS.find((p) => p.key === key)?.label ?? key;
}
