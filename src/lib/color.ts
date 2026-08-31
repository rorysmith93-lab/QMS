// Small colour-math helpers. Pure functions so they work the same on the
// server (rendering the header) and in the browser (live-checking a colour
// as someone picks it on the Settings page).

// Linear's signature indigo — the new default brand colour, used until a
// company picks their own on the Settings page.
export const DEFAULT_BRAND_COLOR = "#5E6AD2";

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

// WCAG relative luminance of an sRGB colour.
function relativeLuminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colours (1 = no contrast, 21 = max).
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA) + 0.05;
  const lB = relativeLuminance(hexB) + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

// Is white text readable on top of this colour? WCAG AA calls for at least
// 4.5:1 for normal-sized text, which is what button labels are here.
export function isReadableWithWhiteText(hex: string): boolean {
  if (!isValidHexColor(hex)) return true;
  return contrastRatio(hex, "#ffffff") >= 4.5;
}

// A darker version of a colour (blends towards black by `amount`).
export function darken(hex: string, amount = 0.15): string {
  if (!isValidHexColor(hex)) return hex;
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(value * (1 - amount));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// A lighter version of a colour (blends towards white by `amount`). On a
// dark background, hover states read better as lighter, not darker — this
// is what buttons/links use for :hover against our dark theme.
export function lighten(hex: string, amount = 0.15): string {
  if (!isValidHexColor(hex)) return hex;
  const channels = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(value + (255 - value) * amount);
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
