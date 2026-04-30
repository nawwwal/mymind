export function parseOptionalLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid --limit (expect a non-negative number)");
  return n;
}
