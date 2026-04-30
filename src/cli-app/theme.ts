import pc from "picocolors";
import { useColor } from "./io.js";

/** CLI-only styling helpers; respect `--no-color` / NO_COLOR via `useColor()`. */
export function emphasis(text: string): string {
  return useColor() ? pc.cyan(text) : text;
}

export function muted(text: string): string {
  return useColor() ? pc.dim(text) : text;
}

export function warnStyle(text: string): string {
  return useColor() ? pc.yellow(text) : text;
}
