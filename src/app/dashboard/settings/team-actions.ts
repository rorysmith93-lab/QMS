"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { ROLES, isAdmin } from "@/lib/roles";

const VALID_ROLES = ROLES.map((r) => r.value);
const TEAM_PATH = "/dashboard/settings/team";

export async function inviteTeammate(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!isAdmin(profile.role)) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Only admins can invite people.")}`);
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");

  if (!email || !email.includes("@")) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Please enter a valid email address.")}`);
  }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Invalid role.")}`);
  }

  const { error } = await supabase.from("company_invites").insert({
    company_id: profile.company_id,
    email,
    role,
    invited_by: profile.id,
  });

  if (error) {
    // Most likely cause: that email already has a pending invite somewhere.
    redirect(
      `${TEAM_PATH}?error=${encodeURIComponent(
        error.code === "23505" ? `${email} already has a pending invite.` : error.message
      )}`
    );
  }

  revalidatePath(TEAM_PATH);
  redirect(`${TEAM_PATH}?invited=${encodeURIComponent(email)}`);
}

export async function revokeInvite(inviteId: string) {
  const { profile, supabase } = await requireProfile();

  if (!isAdmin(profile.role)) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Only admins can manage invites.")}`);
  }

  const { error } = await supabase.from("company_invites").delete().eq("id", inviteId);

  if (error) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(TEAM_PATH);
  redirect(TEAM_PATH);
}

export async function updateMemberRole(targetProfileId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!isAdmin(profile.role)) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Only admins can change roles.")}`);
  }

  const role = String(formData.get("role") || "");
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent("Invalid role.")}`);
  }

  // Never leave the company with zero admins.
  if (role !== "admin") {
    const { data: target } = await supabase.from("profiles").select("role").eq("id", targetProfileId).single();
    if (target?.role === "admin") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        redirect(
          `${TEAM_PATH}?error=${encodeURIComponent(
            "Can't remove the last admin — promote someone else first."
          )}`
        );
      }
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", targetProfileId);

  if (error) {
    redirect(`${TEAM_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(TEAM_PATH);
  redirect(TEAM_PATH);
}
