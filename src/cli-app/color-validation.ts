/** Loose CSS color check for space create/update (API may still reject). */
export function assertLikelyCssColor(raw: string | undefined): void {
  if (raw === undefined || raw === "") return;
  const value = raw.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return;
  if (/^rgba?\(/i.test(value)) return;
  if (/^hsla?\(/i.test(value)) return;
  if (/^[a-z][a-z0-9]*$/i.test(value) && value.length <= 30) return;
  throw new Error(
    `Invalid --color "${raw}". Use hex (#rgb / #rrggbb), rgb()/hsl(), or a short CSS color name.`
  );
}
