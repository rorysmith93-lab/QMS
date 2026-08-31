"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { FISHBONE_CATEGORIES, linesToList } from "@/lib/root-cause-tools";

type ToolType = "five_whys" | "fishbone" | "eight_d";

// Shared by all three tools: find the existing analysis of this type for
// this NCR (there can be at most one, per the DB's partial unique index),
// then insert or update accordingly.
async function saveAnalysis(ncId: string, type: ToolType, data: Record<string, unknown>) {
  const { profile, supabase } = await requireProfile();

  const { data: existing } = await supabase
    .from("root_cause_analyses")
    .select("id")
    .eq("non_conformance_id", ncId)
    .eq("type", type)
    .maybeSingle<{ id: string }>();

  const result = existing
    ? await supabase.from("root_cause_analyses").update({ data }).eq("id", existing.id)
    : await supabase.from("root_cause_analyses").insert({
        company_id: profile.company_id,
        non_conformance_id: ncId,
        type,
        data,
        created_by: profile.id,
      });

  if (result.error) {
    redirect(`/dashboard/non-conformances/${ncId}?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath(`/dashboard/non-conformances/${ncId}`);
  redirect(`/dashboard/non-conformances/${ncId}`);
}

export async function saveFiveWhys(ncId: string, formData: FormData) {
  const problem = String(formData.get("problem") || "").trim();
  const whys = formData
    .getAll("why")
    .map((w) => String(w).trim())
    .filter(Boolean);

  await saveAnalysis(ncId, "five_whys", { problem, whys });
}

export async function saveFishbone(ncId: string, formData: FormData) {
  const problem = String(formData.get("problem") || "").trim();
  const data: Record<string, unknown> = { problem };

  for (const category of FISHBONE_CATEGORIES) {
    data[category.key] = linesToList(String(formData.get(category.key) || ""));
  }

  await saveAnalysis(ncId, "fishbone", data);
}

export async function saveEightD(ncId: string, formData: FormData) {
  const data = {
    team: String(formData.get("team") || "").trim(),
    d2ProblemDescription: String(formData.get("d2ProblemDescription") || "").trim(),
    d3Containment: String(formData.get("d3Containment") || "").trim(),
    d4RootCause: String(formData.get("d4RootCause") || "").trim(),
    d5CorrectiveAction: String(formData.get("d5CorrectiveAction") || "").trim(),
    d6Implementation: String(formData.get("d6Implementation") || "").trim(),
    d7Prevention: String(formData.get("d7Prevention") || "").trim(),
    d8Closure: String(formData.get("d8Closure") || "").trim(),
  };

  await saveAnalysis(ncId, "eight_d", data);
}
