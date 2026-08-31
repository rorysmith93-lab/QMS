-- ============================================================================
-- QMS Rapid — Demo / example data
-- Run this in the Supabase SQL Editor AFTER every other schema file has
-- been run at least once. Requires that you've signed up and logged in
-- at least once already (it seeds data into your existing company).
--
-- Creates 5 realistic example records in every module that doesn't need a
-- real uploaded file: Equipment, Non-Conformances, Internal Audits (+
-- findings), Management Reviews, Quality Policy (5 versions), Quality
-- Objectives, Training records, and Work Instructions (+ steps). A few of
-- these deliberately reference each other (an audit finding linked to an
-- NCR, a work instruction linked to a piece of equipment, an equipment
-- calibration that's overdue) so the cross-module features have something
-- real to show.
--
-- Document Control isn't included — every document needs an actual
-- uploaded file, which SQL can't create. Upload 5 there yourself via the
-- UI (Documents → New document) to round that module out too.
--
-- Safe to run once. Running it again adds a SECOND set of demo records
-- rather than replacing the first — it doesn't check for existing data.
-- ============================================================================

do $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_profile_name text;
  v_profile2_id uuid;
  v_profile3_id uuid;

  v_equip_caliper_id uuid;
  v_equip_wrench_id uuid;
  v_equip_mill_id uuid;

  v_ncr_supplier_id uuid;

  v_audit1_id uuid;
  v_audit2_id uuid;
  v_audit3_id uuid;

  v_wi1_id uuid;
  v_wi2_id uuid;
  v_wi3_id uuid;
  v_wi4_id uuid;
  v_wi5_id uuid;
begin
  -- Target company: the first one found. If you have more than one
  -- company/test account in this project, replace this whole SELECT with
  -- a specific company_id instead.
  select c.id, p.id, p.full_name
  into v_company_id, v_profile_id, v_profile_name
  from public.companies c
  join public.profiles p on p.company_id = c.id
  order by c.created_at asc, p.created_at asc
  limit 1;

  if v_company_id is null then
    raise exception 'No company/profile found — sign up and log in at least once before running this seed script.';
  end if;

  v_profile_name := coalesce(v_profile_name, 'Team Member');

  -- A second/third team member, if you've added other users — spreads
  -- training records across them. Falls back to the same person if not.
  select id into v_profile2_id from public.profiles
    where company_id = v_company_id and id <> v_profile_id
    order by created_at asc limit 1;
  select id into v_profile3_id from public.profiles
    where company_id = v_company_id and id not in (v_profile_id, coalesce(v_profile2_id, v_profile_id))
    order by created_at asc limit 1;
  v_profile2_id := coalesce(v_profile2_id, v_profile_id);
  v_profile3_id := coalesce(v_profile3_id, v_profile_id);

  -- ==========================================================================
  -- EQUIPMENT (5) + calibration records
  -- ==========================================================================
  insert into public.equipment_items (company_id, name, requires_calibration, created_by)
    values (v_company_id, 'Digital Caliper #1', true, v_profile_id)
    returning id into v_equip_caliper_id;

  insert into public.equipment_items (company_id, name, requires_calibration, created_by)
    values (v_company_id, 'Torque Wrench #4', true, v_profile_id)
    returning id into v_equip_wrench_id;

  insert into public.equipment_items (company_id, name, requires_calibration, created_by)
    values (v_company_id, 'CNC Mill #2', true, v_profile_id)
    returning id into v_equip_mill_id;

  insert into public.equipment_items (company_id, name, requires_calibration, created_by) values
    (v_company_id, 'Safety Glasses Storage Rack', false, v_profile_id),
    (v_company_id, 'Label Printer', false, v_profile_id);

  insert into public.equipment_calibrations
    (company_id, equipment_item_id, calibrated_date, next_due_date, performed_by, result, notes, created_by)
  values
    (v_company_id, v_equip_caliper_id, current_date - 100, current_date + 265,
     'Precision Calibration Ltd.', 'pass', null, v_profile_id),
    (v_company_id, v_equip_wrench_id, current_date - 400, current_date - 35,
     'Precision Calibration Ltd.', 'pass', 'Overdue for its next calibration — see WI-0004 and CAPA-0005.', v_profile_id),
    (v_company_id, v_equip_mill_id, current_date - 20, current_date + 40,
     'Internal', 'adjusted', 'Minor spindle alignment adjustment made during calibration.', v_profile_id);

  -- ==========================================================================
  -- NON-CONFORMANCES (5) — ncr_number is assigned automatically
  -- ==========================================================================
  insert into public.non_conformances (
    company_id, title, description, source, status, date_reported, reported_by, department,
    item_or_process, lot_or_serial, quantity_affected, assigned_to, due_date, capa_required, created_by
  ) values (
    v_company_id, 'Oversized bore on housing batch #482',
    'Bore diameter measured 0.15mm over the upper tolerance on a sample of the batch.',
    'internal_process', 'open', current_date - 3, v_profile_name, 'Machining',
    'Housing – Model H200', 'LOT-2026-0482', 12, v_profile_id, current_date + 7, false, v_profile_id
  );

  insert into public.non_conformances (
    company_id, title, description, source, status, date_reported, reported_by, department,
    item_or_process, lot_or_serial, quantity_affected, assigned_to, due_date,
    containment_action, containment_responsible, containment_date, capa_required, created_by
  ) values (
    v_company_id, 'Customer reported cracked bracket on delivery',
    'Customer opened the shipment and found a hairline crack in the mounting bracket casting.',
    'customer_return', 'under_review', current_date - 10, v_profile_name, 'Customer Returns',
    'Mounting Bracket B-12', 'SN-99213', 1, v_profile_id, current_date + 2,
    'Return authorized, unit quarantined on receipt for inspection.', v_profile_name, current_date - 9, true, v_profile_id
  );

  insert into public.non_conformances (
    company_id, title, description, source, status, date_reported, reported_by, department,
    item_or_process, lot_or_serial, quantity_affected, due_date,
    containment_action, containment_responsible, containment_date,
    disposition, disposition_details, qm_approval_name, qm_approval_date, eng_approval_name, eng_approval_date,
    capa_required, capa_tracking_number, root_cause_category, root_cause, verification_notes,
    reinspection_outcome, qa_inspector_name, qa_inspector_date, created_by, closed_at
  ) values (
    v_company_id, 'Wrong torque applied during final assembly',
    'Post-assembly audit found 6 units in the batch below the specified torque value on 2 fasteners.',
    'internal_process', 'verified_closed', current_date - 45, v_profile_name, 'Final Assembly',
    'Gearbox Assembly Line 2', 'LOT-2026-0410', 6, current_date - 30,
    'All units in batch re-torqued and 100% re-inspected before release.', v_profile_name, current_date - 44,
    'rework', 'Units reworked to correct torque spec, 100% re-inspected before release.',
    v_profile_name, current_date - 40, 'J. Patel', current_date - 40,
    true, 'CAPA-0005', 'human_factor',
    'Operator used an incorrect torque setting on the pneumatic wrench following a tool changeover; the setting was not verified against the work instruction before starting the batch.',
    'Re-inspected 100% of the affected batch plus the next 3 batches — no further torque deviations found. Operator retrained and refresher training logged.',
    'pass', v_profile_name, current_date - 32, v_profile_id, now() - interval '28 days'
  );

  -- Linked below from an audit finding (supplier issue)
  insert into public.non_conformances (
    company_id, title, description, source, status, date_reported, reported_by, department,
    item_or_process, lot_or_serial, quantity_affected, due_date,
    containment_action, containment_responsible, containment_date,
    disposition, disposition_details, qm_approval_name, qm_approval_date, eng_approval_name, eng_approval_date,
    capa_required, capa_tracking_number, created_by
  ) values (
    v_company_id, 'Supplier-certified steel below spec hardness',
    'Incoming bar stock was accepted without a hardness check, then found on later audit to be below the specified range for the certificate on file.',
    'supplier_issue', 'disposition_agreed', current_date - 20, v_profile_name, 'Goods In',
    'Raw Steel Bar Stock', 'HEAT-33871', 340, current_date - 5,
    'Batch quarantined in the goods-in hold area; supplier notified.', v_profile_name, current_date - 19,
    'return_to_vendor', 'Return the full batch to the supplier for credit; sourcing an alternate supplier for the next order.',
    v_profile_name, current_date - 4, 'J. Patel', current_date - 4,
    true, 'CAPA-0007', v_profile_id
  ) returning id into v_ncr_supplier_id;

  -- A standalone example of the kind of NCR the "Create NCR for corrective
  -- action" button on an audit finding produces (source = internal_audit).
  insert into public.non_conformances (
    company_id, title, description, source, status, date_reported, reported_by, department,
    item_or_process, due_date, capa_required, created_by
  ) values (
    v_company_id, 'Audit finding: torque wrench out of calibration',
    'Internal audit found Torque Wrench #4 had no visible calibration sticker and was overdue for its next calibration.',
    'internal_audit', 'open', current_date - 1, v_profile_name, 'Calibration',
    'Torque Wrench #4', current_date + 14, true, v_profile_id
  );

  -- ==========================================================================
  -- INTERNAL AUDITS (5) + findings — audit_number is assigned automatically
  -- ==========================================================================
  insert into public.internal_audits
    (company_id, title, process_area, clause_reference, lead_auditor, status, planned_date, actual_date, scope, summary, created_by)
  values (
    v_company_id, 'Q1 2026 Machining Process Audit', 'Machining', '8.5 Production and service provision',
    v_profile_name, 'completed', current_date - 60, current_date - 58,
    'Verify machining process controls, tool calibration records, and work instruction adherence on Line 1 and Line 2.',
    'Overall process is effective. Two findings raised, both closed out with corrective action.', v_profile_id
  ) returning id into v_audit1_id;

  insert into public.audit_findings
    (company_id, audit_id, finding_type, clause_reference, description, evidence, corrective_action_required, status, closed_date, created_by)
  values
    (v_company_id, v_audit1_id, 'nonconformity', '7.1.5',
     'Torque wrench #4 had no visible calibration sticker; last calibration date could not be confirmed at the time of audit.',
     'Photo taken of the wrench at station 2 — no label present.', true, 'closed', current_date - 40, v_profile_id),
    (v_company_id, v_audit1_id, 'observation', null,
     'Printed copy of WI-0012 at station 2 was one revision behind the current published version.',
     null, false, 'closed', current_date - 55, v_profile_id);

  insert into public.internal_audits
    (company_id, title, process_area, clause_reference, lead_auditor, status, planned_date, actual_date, scope, summary, created_by)
  values (
    v_company_id, 'Q2 2026 Goods-In & Supplier Receiving Audit', 'Goods In',
    '8.4 Control of externally provided processes, products and services',
    'J. Patel', 'completed', current_date - 30, current_date - 28,
    'Review supplier receiving inspection records and incoming material traceability.',
    'One nonconformity raised relating to a specific supplier batch; corrective action in progress via the linked NCR.', v_profile_id
  ) returning id into v_audit2_id;

  insert into public.audit_findings
    (company_id, audit_id, finding_type, clause_reference, description, evidence, corrective_action_required, status, linked_ncr_id, created_by)
  values (
    v_company_id, v_audit2_id, 'nonconformity', '8.4.2',
    'Incoming steel bar stock heat HEAT-33871 was accepted without a hardness check against the supplier certificate.',
    'Certificate on file did not match the required spec; no hardness test recorded on the goods-in checklist.',
    true, 'open', v_ncr_supplier_id, v_profile_id
  );

  insert into public.internal_audits
    (company_id, title, process_area, clause_reference, lead_auditor, status, planned_date, actual_date, scope, summary, created_by)
  values (
    v_company_id, 'Q3 2026 Final Assembly & Torque Control Audit', 'Final Assembly', '8.5.1',
    v_profile_name, 'completed', current_date - 15, current_date - 14,
    'Verify torque control practices following the corrective action from CAPA-0005.',
    'Corrective actions from CAPA-0005 verified as effective. No new nonconformities found.', v_profile_id
  ) returning id into v_audit3_id;

  insert into public.audit_findings
    (company_id, audit_id, finding_type, description, corrective_action_required, status, created_by)
  values (
    v_company_id, v_audit3_id, 'opportunity_for_improvement',
    'Consider adding a physical torque-value placard at each assembly station to reduce reliance on memory/verbal handover.',
    false, 'open', v_profile_id
  );

  insert into public.internal_audits
    (company_id, title, process_area, clause_reference, lead_auditor, status, planned_date, scope, created_by)
  values (
    v_company_id, 'Q3 2026 Document Control Audit', 'Quality / Document Control',
    '7.5 Control of documented information', v_profile_name, 'in_progress', current_date + 3,
    'Review document approval workflow and version control practices across all controlled documents.', v_profile_id
  );

  insert into public.internal_audits
    (company_id, title, process_area, clause_reference, lead_auditor, status, planned_date, scope, created_by)
  values (
    v_company_id, 'Q4 2026 Internal Audit — Full QMS Surveillance', 'All areas', '9.2 Internal audit',
    v_profile_name, 'planned', current_date + 45,
    'Annual full-scope internal audit ahead of the external certification surveillance visit.', v_profile_id
  );

  -- ==========================================================================
  -- MANAGEMENT REVIEWS (5) — review_number is assigned automatically
  -- ==========================================================================
  insert into public.management_reviews (
    company_id, title, review_date, attendees, status,
    previous_actions_status, context_changes, customer_feedback, objectives_performance,
    nc_capa_summary, audit_summary, resource_adequacy, risk_opportunity_effectiveness,
    improvement_opportunities, qms_changes_needed, resource_needs, created_by
  ) values (
    v_company_id, 'Management Review — Q4 2025', (current_date - interval '11 months')::date,
    v_profile_name || ', J. Patel (Ops)', 'completed',
    'First review — no prior actions to follow up.', 'QMS Rapid rolled out this quarter; no other major changes.',
    'No formal feedback mechanism yet — informal feedback positive.', 'Objectives not yet formally set.',
    'No NCRs logged yet this quarter.', 'No audits conducted yet.', 'Adequate for current output levels.',
    'Not yet formally assessed.', 'Set up formal quality objectives and an audit schedule for next quarter.',
    'None identified.', 'None identified.', v_profile_id
  );

  insert into public.management_reviews (
    company_id, title, review_date, attendees, status,
    previous_actions_status, context_changes, customer_feedback, objectives_performance,
    nc_capa_summary, audit_summary, resource_adequacy, risk_opportunity_effectiveness,
    improvement_opportunities, qms_changes_needed, resource_needs, created_by
  ) values (
    v_company_id, 'Management Review — Q1 2026', (current_date - interval '8 months')::date,
    v_profile_name || ', J. Patel (Ops)', 'completed',
    'Quality objectives set as planned.', 'No significant changes.',
    'One customer return received (Mounting Bracket B-12) — under investigation.',
    'Too early to assess against the new objectives.',
    '2 NCRs open, 0 closed.', 'First internal audit scheduled for Q1.', 'Adequate.',
    'Risk register not yet started.', 'Start a basic risk and opportunity register.',
    'None identified.', 'None identified.', v_profile_id
  );

  insert into public.management_reviews (
    company_id, title, review_date, attendees, status,
    previous_actions_status, context_changes, customer_feedback, objectives_performance,
    nc_capa_summary, audit_summary, resource_adequacy, risk_opportunity_effectiveness,
    improvement_opportunities, qms_changes_needed, resource_needs, created_by
  ) values (
    v_company_id, 'Management Review — Q2 2026', (current_date - interval '5 months')::date,
    v_profile_name || ', J. Patel (Ops)', 'completed',
    'Risk register started.', 'No significant changes.',
    'B-12 return closed out with corrective action; no new complaints.',
    'On track on 1 of 2 objectives set so far.',
    '3 NCRs logged this period, 1 closed with CAPA-0005.',
    'Q1 Machining Process Audit completed — 2 findings, both closed.', 'Adequate.',
    'Basic risk register in place, no major risks identified yet.',
    'Continue rolling out the internal audit schedule to the remaining process areas.',
    'None identified.', 'None identified.', v_profile_id
  );

  insert into public.management_reviews (
    company_id, title, review_date, attendees, status,
    previous_actions_status, context_changes, customer_feedback, objectives_performance,
    nc_capa_summary, audit_summary, resource_adequacy, risk_opportunity_effectiveness,
    improvement_opportunities, qms_changes_needed, resource_needs, created_by
  ) values (
    v_company_id, 'Management Review — Q3 2026', (current_date - interval '3 days')::date,
    v_profile_name || ', J. Patel (Ops)', 'completed',
    'CAPA-0005 (torque rework) verified effective via the Q3 Final Assembly audit.', 'No significant changes to context.',
    'Customer feedback stable; no new complaints this period.',
    '1 objective achieved (digital work instructions), 1 missed (Line 2 scrap rate), 1 at risk (audit cycle), 1 on track (customer returns).',
    '5 NCRs logged year to date: 1 verified closed, 1 disposition agreed pending supplier return, 1 under review, 2 open.',
    '3 audits completed this year, 1 in progress, 1 planned for Q4.',
    'Adequate, though the Document Control audit is behind schedule.',
    'Risk register reviewed — supplier quality flagged as an area to watch given the HEAT-33871 finding.',
    'Investigate the root cause of the missed Line 2 scrap objective in more depth next quarter.',
    'None identified.', 'Possible need for a second calibrated torque wrench to reduce single-tool dependency.', v_profile_id
  );

  insert into public.management_reviews (company_id, title, review_date, status, created_by)
  values (v_company_id, 'Management Review — Q4 2026', (current_date + interval '2 months')::date, 'planned', v_profile_id);

  -- ==========================================================================
  -- QUALITY POLICY (5 versions) — version number is assigned automatically
  -- ==========================================================================
  insert into public.quality_policies (company_id, statement, effective_date, approved_by, created_by) values
    (v_company_id, 'We aim to meet customer requirements and deliver quality products.',
     (current_date - interval '14 months')::date, v_profile_name, v_profile_id),
    (v_company_id, 'We are committed to meeting customer and applicable regulatory requirements, and to continually improving our processes.',
     (current_date - interval '10 months')::date, v_profile_name, v_profile_id),
    (v_company_id, 'We are committed to meeting customer and applicable regulatory requirements, to continually improving our quality management system, and to preventing nonconformities through effective process control.',
     (current_date - interval '6 months')::date, v_profile_name, v_profile_id),
    (v_company_id, 'We are committed to delivering products that consistently meet customer and regulatory requirements, to the continual improvement of our quality management system, and to working towards ISO 9001 certification as evidence of that commitment.',
     (current_date - interval '3 months')::date, v_profile_name, v_profile_id),
    (v_company_id, 'We are committed to delivering products that consistently meet customer and applicable regulatory requirements. We continually improve the effectiveness of our quality management system, engage every employee in that effort, and set measurable quality objectives that are reviewed at each management review.',
     (current_date - interval '1 month')::date, v_profile_name, v_profile_id);

  -- ==========================================================================
  -- QUALITY OBJECTIVES (5) — one of each status, for a full showcase
  -- ==========================================================================
  insert into public.quality_objectives (company_id, title, target, owner, target_date, status, progress_notes, created_by) values
    (v_company_id, 'Reduce customer returns', 'Fewer than 2% of shipped orders returned due to defect',
     v_profile_id, current_date + 120, 'on_track',
     'Currently at 2.4%, trending down after adding a final inspection step in July.', v_profile_id),
    (v_company_id, 'Complete first full internal audit cycle', 'Every process area audited at least once this year',
     v_profile_id, current_date + 60, 'at_risk',
     '3 of 5 planned audits completed; Document Control audit behind schedule.', v_profile_id),
    (v_company_id, 'Reduce late supplier deliveries', '95% of supplier deliveries on time or early',
     null, current_date + 90, 'not_started', null, v_profile_id),
    (v_company_id, 'Roll out digital work instructions to shop floor',
     '100% of active work instructions available digitally at each station',
     v_profile_id, current_date - 30, 'achieved',
     'Completed ahead of schedule — all active work instructions published and accessible via tablet at each station.', v_profile_id),
    (v_company_id, 'Reduce scrap rate on Line 2', 'Scrap rate below 1.5% by end of Q2',
     v_profile_id, current_date - 50, 'missed',
     'Ended Q2 at 2.1% scrap — root cause traced to a torque issue (see CAPA-0005); corrective action now in place for Q3.', v_profile_id);

  -- ==========================================================================
  -- TRAINING RECORDS (5)
  -- ==========================================================================
  insert into public.training_records
    (company_id, profile_id, training_title, training_type, provider, completed_date, expiry_date, notes, created_by)
  values
    (v_company_id, v_profile_id, 'Forklift Operator Certification', 'certification', 'SafeLift Training Co.',
     current_date - 400, current_date - 20, 'Renewal booked for next month.', v_profile_id),
    (v_company_id, v_profile2_id, 'ISO 9001:2015 Awareness Training', 'induction', null,
     current_date - 200, null, 'Covers QMS structure, the quality policy, and everyone''s role in it.', v_profile_id),
    (v_company_id, v_profile3_id, 'First Aid at Work', 'external_course', 'Red Cross',
     current_date - 300, current_date + 25, null, v_profile_id),
    (v_company_id, v_profile_id, 'Internal Auditor Training', 'refresher', 'Internal',
     current_date - 60, current_date + 700, 'Qualifies to lead internal audits per clause 9.2.', v_profile_id),
    (v_company_id, v_profile2_id, 'Torque Tool Calibration & Use', 'refresher', 'Internal',
     current_date - 10, current_date + 355, 'Refresher issued following the CAPA-0005 corrective action.', v_profile_id);

  -- ==========================================================================
  -- WORK INSTRUCTIONS (5) + steps
  -- ==========================================================================
  insert into public.work_instructions (company_id, title, document_number, status, created_by)
    values (v_company_id, 'Assembling Gearbox Housing – Model H200', 'WI-0001', 'approved', v_profile_id)
    returning id into v_wi1_id;

  insert into public.work_instruction_steps (work_instruction_id, company_id, position, title, body, caution) values
    (v_wi1_id, v_company_id, 1, 'Prepare components',
     'Lay out the housing, bearing set, and fasteners on the assembly mat. Verify part numbers against the build sheet.', null),
    (v_wi1_id, v_company_id, 2, 'Fit bearings',
     'Press bearings into the housing using the arbor press, applying even pressure until fully seated.',
     'Do not strike bearings directly — use the correct press fixture to avoid damaging the race.'),
    (v_wi1_id, v_company_id, 3, 'Torque fasteners',
     'Torque all housing fasteners to 45 Nm in the sequence shown on the build sheet, then re-check with a calibrated torque wrench.',
     'Confirm the torque wrench is within its current calibration date before use.');

  insert into public.work_instructions (company_id, title, document_number, status, created_by)
    values (v_company_id, 'Incoming Material Inspection – Raw Steel Bar Stock', 'WI-0002', 'approved', v_profile_id)
    returning id into v_wi2_id;

  insert into public.work_instruction_steps (work_instruction_id, company_id, position, title, body, caution) values
    (v_wi2_id, v_company_id, 1, 'Check documentation',
     'Confirm the supplier certificate of conformity matches the purchase order and material spec.', null),
    (v_wi2_id, v_company_id, 2, 'Verify hardness',
     'Take a hardness reading from each bar in the sample set using the Rockwell tester and record the result.',
     'Reject the batch and raise a non-conformance if any reading falls outside the specified range.'),
    (v_wi2_id, v_company_id, 3, 'Label and release',
     'Apply a goods-in label showing heat number and inspection date, then move to raw material storage.', null);

  insert into public.work_instructions (company_id, title, document_number, status, ppe_items, created_by)
    values (
      v_company_id, 'PPE Requirements for Machining Area', 'WI-0003', 'draft',
      array['eye_protection', 'ear_protection', 'hand_protection', 'foot_protection'], v_profile_id
    )
    returning id into v_wi3_id;

  insert into public.work_instruction_steps (work_instruction_id, company_id, position, title, body, caution) values
    (v_wi3_id, v_company_id, 1, 'Entering the machining area',
     'All personnel must wear the required PPE before crossing the yellow line into the machining area.', null),
    (v_wi3_id, v_company_id, 2, 'Operating CNC equipment',
     'Confirm guards are in place and the emergency stop is accessible before starting any CNC program.',
     'Never operate equipment with guards removed or bypassed.');

  insert into public.work_instructions (company_id, title, document_number, status, created_by)
    values (v_company_id, 'Final Assembly Torque Control', 'WI-0004', 'approved', v_profile_id)
    returning id into v_wi4_id;

  insert into public.work_instruction_steps (work_instruction_id, company_id, position, title, body, caution) values
    (v_wi4_id, v_company_id, 1, 'Set torque wrench',
     'Set the calibrated torque wrench to the value specified on the current build sheet before starting the batch.',
     'Confirm the tool is within its calibration due date — see the Equipment library for status.'),
    (v_wi4_id, v_company_id, 2, 'Apply and verify torque',
     'Apply torque in the sequence shown, then perform a second-pass check on a sample of 1 in 10 units.',
     'Any deviation must be reported immediately and the batch quarantined.');

  insert into public.work_instruction_equipment (work_instruction_id, equipment_item_id, company_id)
    values (v_wi4_id, v_equip_wrench_id, v_company_id);

  insert into public.work_instructions (company_id, title, document_number, status, created_by)
    values (v_company_id, 'Customer Return Inspection & Disposition', 'WI-0005', 'archived', v_profile_id)
    returning id into v_wi5_id;

  insert into public.work_instruction_steps (work_instruction_id, company_id, position, title, body, caution) values
    (v_wi5_id, v_company_id, 1, 'Log the return',
     'Record the customer, part number, serial/lot number, and stated reason for return in the returns register.', null),
    (v_wi5_id, v_company_id, 2, 'Inspect and photograph',
     'Inspect the returned unit against the original specification and photograph any visible defect before disposition.', null);

  raise notice 'Demo data seeded successfully for company %.', v_company_id;
end $$;
