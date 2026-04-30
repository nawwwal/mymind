import { muted } from "../theme.js";

export function startSpinner(label: string): () => void {
  if (!process.stderr.isTTY) return () => undefined;
  let frame = 0;
  let timer: NodeJS.Timeout | undefined;
  const frames = ["·", "∙"];
  const start = setTimeout(() => {
    timer = setInterval(() => {
      process.stderr.write(`\r${muted(frames[frame++ % frames.length] ?? ".")} ${label}`);
    }, 180);
  }, 400);
  return () => {
    clearTimeout(start);
    if (timer) clearInterval(timer);
    process.stderr.write("\r");
  };
}

