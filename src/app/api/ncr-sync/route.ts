// Receives non-conformances raised in the Custom MES App and mirrors them
// into this company's non_conformances register, authenticated via a
// per-company API key (companies.ncr_sync_api_key, generated from
// Settings — see src/app/dashboard/settings/actions.ts). One-way and
// best-effort from MES's side: MES pushes creation and open/closed status;
// QMS is the system of record for everything after that (assignment, root
// cause, corrective action) — this endpoint never reads those back.
//
// This is the one route in the app that uses the service-role Supabase
// client (src/lib/supabase/service.ts) — there's no logged-in session to
// anchor RLS to, so the API key check below IS the authorization.
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type SyncPayload = {
  test?: boolean;
  originRef?: string;
  title?: string;
  description?: string;
  status?: "open" | "closed";
  closedAt?: string | null;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const key = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!key) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("ncr_sync_api_key", key)
    .single<{ id: string }>();

  if (companyError || !company) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: SyncPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // "Test connection" from MES's Settings page — confirms the key resolves
  // to a real company without writing anything.
  if (body.test) {
    return NextResponse.json({ ok: true });
  }

  if (!body.originRef || !body.title || !body.description || !body.status) {
    return NextResponse.json(
      { error: "originRef, title, description, and status are required" },
      { status: 400 }
    );
  }

  const closedAt = body.status === "closed" ? (body.closedAt ?? new Date().toISOString()) : null;

  // Idempotency: look for a row already synced from this MES NCR before
  // deciding insert vs. update, so a retried/duplicate delivery updates in
  // place rather than creating a second record. (A unique index backs this
  // at the database level too — see ncr_sync_schema.sql — as a safety net
  // for near-simultaneous duplicate deliveries; a plain select-then-branch
  // is enough for a v1 webhook and keeps this route simple.)
  const { data: existing } = await supabase
    .from("non_conformances")
    .select("id")
    .eq("company_id", company.id)
    .eq("origin_system", "mes")
    .eq("origin_ref", body.originRef)
    .maybeSingle<{ id: string }>();

  // MES only knows a binary open/closed state; QMS's own status has more
  // stages in between (src/lib/non-conformances.ts), so a closed delivery
  // maps to our terminal state rather than something in-between.
  const qmsStatus = body.status === "closed" ? "verified_closed" : "open";

  if (existing) {
    const { data, error } = await supabase
      .from("non_conformances")
      .update({ status: qmsStatus, closed_at: closedAt })
      .eq("id", existing.id)
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  const { data, error } = await supabase
    .from("non_conformances")
    .insert({
      company_id: company.id,
      title: body.title,
      description: body.description,
      // "Internal Process" is the closest fit for a shop-floor-raised
      // non-conformance in the current NC_SOURCES list.
      source: "internal_process",
      status: qmsStatus,
      closed_at: closedAt,
      origin_system: "mes",
      origin_ref: body.originRef,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to sync" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
