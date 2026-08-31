"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { FISHBONE_CATEGORIES, linesToList } from "@/lib/root-cause-tools";

const BASE_PATH = "/dashboard/safety/incidents";

type ToolType = "five_whys" | "fishbone";

// Same shared-save shape as src/app/dashboard/non-conformances/root-cause-
// actions.ts, pointed at safety_incident_id instead of non_conformance_id
// — see root_cause_analyses_subject_check in safety_incidents_schema.sql.
async function saveAnalysis(incidentId: string, type: ToolType, data: Record<string, unknown>) {
  const { profile, supabase } = await requireProfile();

  const { data: existing } = await supabase
    .from("root_cause_analyses")
    .select("id")
    .eq("safety_incident_id", incidentId)
    .eq("type", type)
    .maybeSingle<{ id: string }>();

  const result = existing
    ? await supabase.from("root_cause_analyses").update({ data }).eq("id", existing.id)
    : await supabase.from("root_cause_analyses").insert({
        company_id: profile.company_id,
        safety_incident_id: incidentId,
        type,
        data,
        created_by: profile.id,
      });

  if (result.error) {
    redirect(`${BASE_PATH}/${incidentId}?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${incidentId}`);
  redirect(`${BASE_PATH}/${incidentId}`);
}

export async function saveIncidentFiveWhys(incidentId: string, formData: FormData) {
  const problem = String(formData.get("problem") || "").trim();
  const whys = formData
    .getAll("why")
    .map((w) => String(w).trim())
    .filter(Boolean);

  await saveAnalysis(incidentId, "five_whys", { problem, whys });
}

export async function saveIncidentFishbone(incidentId: string, formData: FormData) {
  const problem = String(formData.get("problem") || "").trim();
  const data: Record<string, unknown> = { problem };

  for (const category of FISHBONE_CATEGORIES) {
    data[category.key] = linesToList(String(formData.get(category.key) || ""));
  }

  await saveAnalysis(incidentId, "fishbone", data);
}
