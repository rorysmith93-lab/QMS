"use client";

import { useRef, useState } from "react";

// Fills the two hidden lat/lng inputs from the browser's Geolocation API —
// no native app needed, this works from any phone browser. The surrounding
// form submits those hidden inputs normally; this component has no server
// action of its own.
export function UseMyLocationButton() {
  const [status, setStatus] = useState<"idle" | "locating" | "done" | "error">("idle");
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (latRef.current) latRef.current.value = String(position.coords.latitude);
        if (lngRef.current) lngRef.current.value = String(position.coords.longitude);
        setStatus("done");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={latRef} type="hidden" name="latitude" />
      <input ref={lngRef} type="hidden" name="longitude" />
      <button type="button" onClick={handleClick} className="btn-secondary">
        {status === "locating" ? "Locating…" : "Use my location"}
      </button>
      {status === "done" && <span className="text-xs text-faint">Location captured ✓</span>}
      {status === "error" && <span className="text-xs" style={{ color: "var(--danger)" }}>Couldn&apos;t get location</span>}
    </div>
  );
}
