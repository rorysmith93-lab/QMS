// Builds RFC 4180-ish CSV text from a header row + data rows. Values are
// quoted only when they need to be (contain a comma, quote, or newline),
// with embedded quotes doubled — the standard escaping rule spreadsheet
// apps expect.
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  function escape(value: string | number | null | undefined): string {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  // \r\n line endings and a leading BOM — Excel (still very much how a
  // small manufacturer is likely to open this) needs both to reliably
  // detect UTF-8 and not mangle the line breaks.
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
