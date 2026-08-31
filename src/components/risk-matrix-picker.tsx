"use client";

import { useState } from "react";
import {
  LIKELIHOOD_LEVELS,
  RISK_BAND_FILL,
  SEVERITY_LEVELS,
  riskBandFromScore,
} from "@/lib/risk-assessments";

// The visual 5x5 risk matrix. Lives inside a normal <form action={serverAction}>
// alongside the rest of a hazard row's fields — clicking a cell doesn't
// submit anything itself, it just sets two hidden <input>s that ride along
// when the row's own "Save" button is clicked. Same "small client island
// owning a couple of hidden inputs inside an otherwise server-rendered
// form" pattern as UseMyLocationButton (src/components/use-my-location-button.tsx).
export function RiskMatrixPicker({
  likelihoodName,
  severityName,
  defaultLikelihood,
  defaultSeverity,
  label,
}: {
  likelihoodName: string;
  severityName: string;
  defaultLikelihood: number;
  defaultSeverity: number;
  label: string;
}) {
  const [likelihood, setLikelihood] = useState(defaultLikelihood);
  const [severity, setSeverity] = useState(defaultSeverity);

  return (
    <div>
      <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <input type="hidden" name={likelihoodName} value={likelihood} />
      <input type="hidden" name={severityName} value={severity} />

      <div className="mt-2 inline-block">
        <div className="flex">
          <div className="flex w-20 flex-col-reverse">
            {SEVERITY_LEVELS.map((s) => (
              <div key={s.value} className="flex h-9 items-center justify-end pr-2 text-right text-[10px] text-faint">
                {s.label.split(" (")[0]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {SEVERITY_LEVELS.slice()
              .reverse()
              .map((s) =>
                LIKELIHOOD_LEVELS.map((l) => {
                  const score = l.value * s.value;
                  const band = riskBandFromScore(score);
                  const selected = l.value === likelihood && s.value === severity;
                  return (
                    <button
                      key={`${l.value}-${s.value}`}
                      type="button"
                      onClick={() => {
                        setLikelihood(l.value);
                        setSeverity(s.value);
                      }}
                      aria-pressed={selected}
                      aria-label={`Likelihood ${l.label}, Severity ${s.label} — score ${score}`}
                      className="flex h-9 w-9 items-center justify-center rounded text-xs font-semibold text-white transition-transform"
                      style={{
                        backgroundColor: RISK_BAND_FILL[band],
                        outline: selected ? "2px solid var(--text-primary)" : "none",
                        outlineOffset: 1,
                        transform: selected ? "scale(1.08)" : undefined,
                      }}
                    >
                      {score}
                    </button>
                  );
                })
              )}
          </div>
        </div>
        <div className="ml-20 mt-1 grid grid-cols-5 gap-1">
          {LIKELIHOOD_LEVELS.map((l) => (
            <div key={l.value} className="w-9 text-center text-[10px] text-faint">
              {l.label}
            </div>
          ))}
        </div>
        <p className="ml-20 mt-1 text-[10px] text-faint">Likelihood →</p>
      </div>

      <p className="mt-1 text-xs text-muted">
        {LIKELIHOOD_LEVELS.find((l) => l.value === likelihood)?.label} ·{" "}
        {SEVERITY_LEVELS.find((s) => s.value === severity)?.label} — score {likelihood * severity}
      </p>
    </div>
  );
}
