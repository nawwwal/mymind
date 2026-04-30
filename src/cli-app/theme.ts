import pc from "picocolors";
import figures from "figures";
import terminalLink from "terminal-link";
import { useColor } from "./io.js";

function colorize(fn: (text: string) => string, text: string): string {
  return useColor() ? fn(text) : text;
}

export const theme = {
  color: {
    accent: (text: string) => colorize(pc.yellow, text),
    ink: (text: string) => colorize(pc.white, text),
    muted: (text: string) => colorize(pc.dim, text),
    success: (text: string) => colorize(pc.green, text),
    warning: (text: string) => colorize(pc.yellow, text),
    danger: (text: string) => colorize(pc.red, text),
    link: (text: string) => colorize(pc.cyan, text)
  },
  glyph: {
    bullet: figures.bullet,
    arrow: figures.arrowRight,
    check: figures.tick,
    cross: figures.cross,
    dot: "·"
  },
  copy: {
    saveSuccess: (id: string) => `Saved. ${id}`,
    deleteSuccess: (id: string) => `Removed. ${id}`,
    rateLimited: (seconds: number) => `Rate limited. Retrying in ${seconds}s.`
  }
} as const;

export function link(text: string, url: string): string {
  return terminalLink.isSupported ? terminalLink(text, url) : text;
}

export function emphasis(text: string): string {
  return theme.color.accent(text);
}

export function muted(text: string): string {
  return theme.color.muted(text);
}

export function warnStyle(text: string): string {
  return theme.color.warning(text);
}
