"use client";

import { useState } from "react";
import { HAZARD_LIBRARY, hazardTemplateById } from "@/lib/risk-assessments";
import { RiskMatrixPicker } from "@/components/risk-matrix-picker";

// The "Add hazard" form, wrapped as a client component only so choosing a
// pre-loaded hazard-library entry can prefill the description/who/existing-
// controls fields and the initial-risk matrix's starting cell — everything
// else about submitting is a normal server-action form post, same as every
// other add/edit form in this builder. Remounting the field group via
// `key={templateId}` (rather than fully-controlled inputs) is what lets a
// template swap reset the fields to its own defaults with no extra state
// plumbing.
export function HazardQuickAddForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [templateId, setTemplateId] = useState("");
  const template = hazardTemplateById(templateId);

  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label htmlFor="hazard-template" className="block text-sm font-medium text-[var(--text-primary)]">
          Start from the hazard library <span className="text-faint">(optional)</span>
        </label>
        <select
          id="hazard-template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="field mt-1"
        >
          <option value="">— Blank —</option>
          {HAZARD_LIBRARY.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
            </option>
          ))}
        </select>
      </div>

      <div key={templateId} className="space-y-4">
        <div>
          <label htmlFor="new-hazard-description" className="block text-sm font-medium text-[var(--text-primary)]">
            Hazard description
          </label>
          <textarea
            id="new-hazard-description"
            name="hazardDescription"
            rows={2}
            required
            defaultValue={template?.hazardDescription ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="new-who" className="block text-sm font-medium text-[var(--text-primary)]">
            Who might be harmed
          </label>
          <textarea
            id="new-who"
            name="whoMightBeHarmed"
            rows={2}
            defaultValue={template?.whoMightBeHarmed ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="new-existing-controls" className="block text-sm font-medium text-[var(--text-primary)]">
            Existing controls
          </label>
          <textarea
            id="new-existing-controls"
            name="existingControls"
            rows={2}
            defaultValue={template?.existingControls ?? ""}
            className="field mt-1"
          />
        </div>

        <RiskMatrixPicker
          label="Initial risk (before additional controls)"
          likelihoodName="initialLikelihood"
          severityName="initialSeverity"
          defaultLikelihood={template?.initialLikelihood ?? 3}
          defaultSeverity={template?.initialSeverity ?? 3}
        />
      </div>

      <div>
        <label htmlFor="new-additional-controls" className="block text-sm font-medium text-[var(--text-primary)]">
          Additional controls needed
        </label>
        <textarea id="new-additional-controls" name="additionalControls" rows={2} className="field mt-1" />
      </div>

      <RiskMatrixPicker
        label="Residual risk (after additional controls)"
        likelihoodName="residualLikelihood"
        severityName="residualSeverity"
        defaultLikelihood={1}
        defaultSeverity={1}
      />

      <button type="submit" className="btn-primary">
        Add hazard
      </button>
    </form>
  );
}
