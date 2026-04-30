import { muted } from "../theme.js";

export function formatTable(rows: Array<Record<string, unknown>>, columns: string[]): string {
  if (rows.length === 0) return "";
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String(row[column] ?? "").length))
  );
  const line = (values: string[]) => values.map((value, i) => value.padEnd(widths[i] ?? value.length)).join("  ");
  return [muted(line(columns)), ...rows.map((row) => line(columns.map((column) => String(row[column] ?? ""))))].join("\n");
}

