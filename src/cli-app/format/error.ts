import { theme, muted } from "../theme.js";

export function formatError(message: string, hint?: string, code?: string): string {
  const lines = [theme.color.danger(`Error: ${message}`)];
  if (hint) lines.push(muted(`Hint: ${hint}`));
  if (code) lines.push(muted(`Code: ${code}`));
  return lines.join("\n");
}

