"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PPE_ITEMS, PpeKey } from "@/lib/ppe";
import { PpeIcon } from "@/components/ppe-icons";

export type EquipmentOption = { id: string; name: string; imageUrl: string | null };

// A pop-up picker for the "Required PPE" / "Required Equipment" sections
// of a work instruction — same idea as the photo editor: pick from a
// grid in an overlay, close it, and the selection is what actually gets
// submitted. The hidden inputs below are the real form fields; everything
// else is just the picking UI.
export function RequirementsPicker({
  initialPpe,
  equipmentLibrary,
  initialEquipmentIds,
}: {
  initialPpe: string[];
  equipmentLibrary: EquipmentOption[];
  initialEquipmentIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [ppe, setPpe] = useState<Set<string>>(new Set(initialPpe));
  const [equipment, setEquipment] = useState<Set<string>>(new Set(initialEquipmentIds));

  function togglePpe(key: string) {
    setPpe((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleEquipment(id: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cancel() {
    setPpe(new Set(initialPpe));
    setEquipment(new Set(initialEquipmentIds));
    setOpen(false);
  }

  const selectedEquipment = equipmentLibrary.filter((item) => equipment.has(item.id));

  return (
    <div>
      {/* The actual fields this component's surrounding <form> submits —
          everything above is just UI for editing this set. */}
      {[...ppe].map((key) => (
        <input key={key} type="hidden" name="ppe" value={key} />
      ))}
      {[...equipment].map((id) => (
        <input key={id} type="hidden" name="equipment" value={id} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {ppe.size === 0 && selectedEquipment.length === 0 ? (
          <p className="text-sm text-muted">Nothing selected yet.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {[...ppe].map((key) => (
              <PpeIcon key={key} ppeKey={key as PpeKey} />
            ))}
            {selectedEquipment.map((item) => (
              <div
                key={item.id}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded border"
                style={{ backgroundColor: "#fff", borderColor: "var(--border)" }}
                title={item.name}
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
          Select PPE &amp; equipment
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select required PPE and equipment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="surface flex max-h-[85vh] w-full max-w-2xl flex-col p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Required PPE &amp; Equipment
              </h2>
              <button
                type="button"
                onClick={cancel}
                aria-label="Close without saving changes"
                className="text-sm text-muted hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* p-1 is load-bearing, not cosmetic — see tool-modal.tsx for
                why: overflow-y alone silently makes this clip
                horizontally too, and without padding a focus ring on an
                edge card (leftmost/rightmost column, top/bottom row)
                gets clipped flush against the container boundary. */}
            <div className="mt-4 flex-1 overflow-y-auto p-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">PPE</h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PPE_ITEMS.map((item) => {
                  const checked = ppe.has(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => togglePpe(item.key)}
                      aria-pressed={checked}
                      className="picker-card"
                    >
                      <span className="picker-check" aria-hidden="true">
                        ✓
                      </span>
                      <PpeIcon ppeKey={item.key} />
                      <span className="text-[var(--text-primary)]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <h3 className="mt-6 text-sm font-semibold text-[var(--text-primary)]">Equipment</h3>
              {equipmentLibrary.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Your equipment library is empty.{" "}
                  <Link href="/dashboard/equipment/new" className="link-brand">
                    Add your first tool or piece of equipment
                  </Link>
                  .
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {equipmentLibrary.map((item) => {
                    const checked = equipment.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleEquipment(item.id)}
                        aria-pressed={checked}
                        className="picker-card"
                      >
                        <span className="picker-check" aria-hidden="true">
                          ✓
                        </span>
                        <div
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded"
                          style={{ backgroundColor: "#fff" }}
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt=""
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-500">—</span>
                          )}
                        </div>
                        <span className="text-[var(--text-primary)]">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={cancel} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
