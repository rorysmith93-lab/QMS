// "Notify team" — sends an email when a Document/SOP/Work Instruction/
// Quality Policy is approved, and logs the send into the Communications
// Log (clause 7.4) as real, automatic evidence rather than a manual
// entry. Deliberately its own button, not automatic-on-approve — that
// keeps control over WHEN it goes out (e.g. batching a few changes into
// one email) with whoever approved the content.
//
// Sandbox note: until a sending domain is verified with Resend, it will
// only actually deliver to the Resend account's own email address — every
// other recipient in `to`/`bcc` gets silently rejected by Resend itself.
// The code here is written for the real multi-recipient case; testing
// before domain verification will only show the approver's own address
// receiving it.
import { Resend } from "resend";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type NotifyContentType = "document" | "sop" | "work_instruction" | "quality_policy";

const CONTENT_TYPE_LABELS: Record<NotifyContentType, string> = {
  document: "Document",
  sop: "SOP",
  work_instruction: "Work Instruction",
  quality_policy: "Quality Policy",
};

export async function notifyTeamOfApproval(
  supabase: SupabaseServerClient,
  {
    companyId,
    actorId,
    contentType,
    title,
    linkPath,
  }: {
    companyId: string;
    actorId: string;
    contentType: NotifyContentType;
    title: string;
    linkPath: string;
  }
): Promise<{ sent: number; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: 0, error: "Email isn't set up yet — no RESEND_API_KEY configured." };
  }

  const { data: members } = await supabase.from("profiles").select("id, email, full_name").eq("company_id", companyId);
  const memberList = members ?? [];

  const actor = memberList.find((m) => m.id === actorId);
  const actorEmail = actor?.email;
  if (!actorEmail) {
    return { sent: 0, error: "Could not find your own email address to send from." };
  }

  const otherEmails = Array.from(
    new Set(
      memberList
        .filter((m) => m.id !== actorId)
        .map((m) => m.email)
        .filter((e): e is string => Boolean(e))
    )
  );

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const url = `${siteUrl}${linkPath}`;
  const typeLabel = CONTENT_TYPE_LABELS[contentType];

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "QMS Rapid <onboarding@resend.dev>",
    to: actorEmail,
    ...(otherEmails.length > 0 ? { bcc: otherEmails } : {}),
    subject: `${typeLabel} approved: ${title}`,
    html: `<p>${typeLabel} <strong>${escapeHtml(title)}</strong> has just been approved.</p><p><a href="${url}">View it in QMS Rapid</a></p>`,
  });

  if (error) {
    return { sent: 0, error: error.message };
  }

  const recipientCount = 1 + otherEmails.length;

  // Real, automatic evidence for clause 7.4 — no manual entry needed.
  await supabase.from("communications").insert({
    company_id: companyId,
    direction: "internal",
    audience: "All staff",
    method: "Email",
    summary: `Notified the team that the ${typeLabel.toLowerCase()} "${title}" was approved.`,
    related_to: title,
    communicated_by: actorId,
    created_by: actorId,
  });

  return { sent: recipientCount };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
