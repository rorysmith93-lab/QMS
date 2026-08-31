import { setSafetyAuthorization, setSafetyWorkflowMode } from "@/app/dashboard/safety/documents/authorization/actions";
import { SAFETY_AUTHORIZATION_LEVELS, SAFETY_DOCUMENT_CATEGORIES, SAFETY_WORKFLOW_MODES } from "@/lib/safety-documents";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";
import { requireProfile } from "@/lib/current-profile";

type SettingsRow = { category: string; workflow_mode: string };
type AuthRow = { category: string; profile_id: string; level: string };
type ProfileRow = { id: string; full_name: string | null; email: string };

export default async function SafetyAuthorizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "safetyAuthorization")) {
    return <AccessDenied />;
  }

  const [{ data: settingsRows }, { data: authRows }, { data: members }] = await Promise.all([
    supabase
      .from("safety_document_category_settings")
      .select("category, workflow_mode")
      .eq("company_id", profile.company_id)
      .returns<SettingsRow[]>(),
    supabase
      .from("safety_document_authorizations")
      .select("category, profile_id, level")
      .eq("company_id", profile.company_id)
      .returns<AuthRow[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .order("full_name")
      .returns<ProfileRow[]>(),
  ]);

  const modeByCategory = new Map((settingsRows ?? []).map((s) => [s.category, s.workflow_mode]));
  const levelByCategoryAndProfile = new Map((authRows ?? []).map((a) => [`${a.category}:${a.profile_id}`, a.level]));
  const memberList = members ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Safety Document Authorization</h1>
      <p className="mt-1 text-sm text-muted">
        For each Safety Documents category: how it&apos;s approved, and who&apos;s authorized to author,
        check, or approve it. Separate from the QMS Documents matrix. A category with nobody assigned
        stays open to everyone, nothing is restricted until you set it here.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {SAFETY_DOCUMENT_CATEGORIES.map((cat) => {
          const boundSetMode = setSafetyWorkflowMode.bind(null, cat.value);
          const currentMode = modeByCategory.get(cat.value) ?? "just_approve";

          return (
            <div key={cat.value} className="surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-[var(--text-primary)]">{cat.label}</h2>

                <form action={boundSetMode} className="flex items-center gap-2">
                  <label htmlFor={`mode-${cat.value}`} className="text-xs text-faint">
                    Workflow
                  </label>
                  <AutoSubmitSelect
                    id={`mode-${cat.value}`}
                    name="mode"
                    defaultValue={currentMode}
                    className="field w-auto py-1.5 text-sm"
                  >
                    {SAFETY_WORKFLOW_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                </form>
              </div>

              {memberList.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No team members found.</p>
              ) : (
                <div className="overflow-x-auto"><table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                      <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                        Team member
                      </th>
                      <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                        Authorization
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberList.map((member) => {
                      const boundSetAuth = setSafetyAuthorization.bind(null, cat.value, member.id);
                      const currentLevel = levelByCategoryAndProfile.get(`${cat.value}:${member.id}`) ?? "";

                      return (
                        <tr key={member.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2 text-[var(--text-primary)]">{member.full_name || member.email}</td>
                          <td className="py-2">
                            <form action={boundSetAuth}>
                              <AutoSubmitSelect name="level" defaultValue={currentLevel} className="field w-auto py-1.5 text-sm">
                                <option value="">No access</option>
                                {SAFETY_AUTHORIZATION_LEVELS.map((l) => (
                                  <option key={l.value} value={l.value}>
                                    {l.label}
                                  </option>
                                ))}
                              </AutoSubmitSelect>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
