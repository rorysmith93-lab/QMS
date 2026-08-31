// Storage file paths can only safely contain simple characters, so we strip
// anything else out of the original filename before using it.
export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
