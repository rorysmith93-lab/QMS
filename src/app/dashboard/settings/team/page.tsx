import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { inviteTeammate, revokeInvite, updateMemberRole } from "@/app/dashboard/settings/team-actions";
import { canAccess, ROLES, roleLabel } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type MemberRow = { id: string; full_name: string | null; email: string; role: string };
type InviteRow = { id: string; email: string; role: string; invited_by: string | null; created_at: string };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const { error, invited } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "team")) {
    return <AccessDenied />;
  }

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("company_id", profile.company_id)
      .order("full_name")
      .returns<MemberRow[]>(),
    supabase
      .from("company_invites")
      .select("id, email, role, invited_by, created_at")
      .eq("company_id", profile.company_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })
      .returns<InviteRow[]>(),
  ]);

  const memberList = members ?? [];
  const inviteList = invites ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/settings" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to settings
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Team</h1>
      <p className="mt-1 text-sm text-muted">
        Who has access, and what they can see. Admin, Quality Manager, and Member each see a
        different set of sections — see the sidebar for what&apos;s currently visible to your own role.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}
      {invited && !error && (
        <p role="status" className="banner-success mt-4">
          Invited {invited}. No email was sent automatically — tell them to sign up at{" "}
          <span className="font-mono">{SITE_URL}/signup</span> using that exact email address, and
          they&apos;ll join your team automatically (whatever company name they enter there is ignored).
        </p>
      )}

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Invite a teammate</h2>
        <form action={inviteTeammate} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">
              Email
            </label>
            <input id="email" name="email" type="email" required placeholder="name@company.com" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[var(--text-primary)]">
              Role
            </label>
            <select id="role" name="role" defaultValue="member" className="field mt-1 w-auto">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Send invite
          </button>
        </form>
      </div>

      {inviteList.length > 0 && (
        <div className="surface mt-6 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Pending invites</h2>
          <ul className="mt-3 space-y-2">
            {inviteList.map((inv) => {
              const boundRevoke = revokeInvite.bind(null, inv.id);
              return (
                <li key={inv.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="text-[var(--text-primary)]">{inv.email}</span>
                    <span className="ml-2 text-xs text-faint">
                      {roleLabel(inv.role)} · invited {new Date(inv.created_at).toLocaleDateString()}
                      {inv.invited_by && ` by ${nameById.get(inv.invited_by) ?? "someone"}`}
                    </span>
                  </div>
                  <form action={boundRevoke}>
                    <button type="submit" className="text-xs text-faint hover:text-[var(--danger)]">
                      Revoke
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Team members</h2>
        <ul className="mt-3 space-y-2">
          {memberList.map((member) => {
            const boundUpdateRole = updateMemberRole.bind(null, member.id);
            const isSelf = member.id === profile.id;
            return (
              <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="text-[var(--text-primary)]">{member.full_name || member.email}</span>
                  {isSelf && <span className="ml-2 text-xs text-faint">(you)</span>}
                </div>
                <form action={boundUpdateRole}>
                  <AutoSubmitSelect name="role" defaultValue={member.role} className="field w-auto py-1.5 text-sm">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
