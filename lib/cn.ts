export type ClassValue = string | number | false | null | undefined;

/**
 * Joins class names, dropping falsy values. Small on purpose: we never generate
 * conflicting Tailwind utilities for the same property, so `tailwind-merge`
 * would be dead weight in the bundle.
 */
export function cn(...values: ClassValue[]): string {
  let out = "";
  for (const value of values) {
    if (!value && value !== 0) continue;
    out = out ? `${out} ${value}` : String(value);
  }
  return out;
}
