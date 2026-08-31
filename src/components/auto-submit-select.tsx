"use client";

import type { SelectHTMLAttributes } from "react";

// A <select> that submits its enclosing form the moment its value
// changes — used for the authorization matrix, where each row/cell is its
// own tiny form and a separate "Save" button per row would be noise.
// Needs to be a Client Component: the onChange handler can't be passed as
// a prop from a Server Component.
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
