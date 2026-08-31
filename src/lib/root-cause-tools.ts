export const FISHBONE_CATEGORIES = [
  { key: "manpower", label: "Manpower" },
  { key: "machine", label: "Machine" },
  { key: "material", label: "Material" },
  { key: "method", label: "Method" },
  { key: "measurement", label: "Measurement" },
  { key: "environment", label: "Environment (Mother Nature)" },
] as const;

export type FishboneCategoryKey = (typeof FISHBONE_CATEGORIES)[number]["key"];

export type FiveWhysData = {
  problem: string;
  whys: string[];
};

export type FishboneData = {
  problem: string;
} & Record<FishboneCategoryKey, string[]>;

export type EightDData = {
  team: string;
  d2ProblemDescription: string;
  d3Containment: string;
  d4RootCause: string;
  d5CorrectiveAction: string;
  d6Implementation: string;
  d7Prevention: string;
  d8Closure: string;
};

export const EIGHT_D_SECTIONS: { key: keyof EightDData; label: string; hint: string }[] = [
  { key: "team", label: "D1 — Team", hint: "Who's involved, and their role" },
  {
    key: "d2ProblemDescription",
    label: "D2 — Problem Description",
    hint: "A clear, specific statement of the problem",
  },
  {
    key: "d3Containment",
    label: "D3 — Interim Containment Actions",
    hint: "What's protecting the customer/process right now",
  },
  { key: "d4RootCause", label: "D4 — Root Cause Analysis", hint: "The verified root cause(s)" },
  {
    key: "d5CorrectiveAction",
    label: "D5 — Permanent Corrective Actions",
    hint: "The chosen permanent fix, and why it was selected",
  },
  {
    key: "d6Implementation",
    label: "D6 — Implement & Validate",
    hint: "How the fix was rolled out and confirmed to work",
  },
  {
    key: "d7Prevention",
    label: "D7 — Prevent Recurrence",
    hint: "Systemic changes so this can't happen again, here or elsewhere",
  },
  { key: "d8Closure", label: "D8 — Closure", hint: "Summary and recognition of the team's work" },
];

// Empty-state shapes used to initialize a brand-new analysis.
export function emptyFiveWhys(): FiveWhysData {
  return { problem: "", whys: ["", "", "", "", ""] };
}

export function emptyFishbone(): FishboneData {
  return {
    problem: "",
    manpower: [],
    machine: [],
    material: [],
    method: [],
    measurement: [],
    environment: [],
  };
}

export function emptyEightD(): EightDData {
  return {
    team: "",
    d2ProblemDescription: "",
    d3Containment: "",
    d4RootCause: "",
    d5CorrectiveAction: "",
    d6Implementation: "",
    d7Prevention: "",
    d8Closure: "",
  };
}

// Textareas hold one cause per line for the fishbone editor — these
// convert between that and the string[] stored in the database.
export function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}
