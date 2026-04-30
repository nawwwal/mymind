import { createInterface } from "node:readline";
import { stdin as input } from "node:process";

/** Non-empty trimmed lines from stdin when piped (not a TTY). */
export async function readStdinLines(): Promise<string[]> {
  if (input.isTTY) return [];
  const lines: string[] = [];
  const rl = createInterface({ input });
  for await (const line of rl) {
    const t = line.trim();
    if (t.length > 0) lines.push(t);
  }
  return lines;
}

/** Read full stdin as UTF-8 text (for `note`). */
export async function readStdinAll(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
