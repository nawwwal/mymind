import { theme } from "../theme.js";

export function formatConfirm(message: string): string {
  return `${theme.glyph.bullet} ${message}`;
}

