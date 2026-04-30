import { MyMindApiError } from "../mymind/client.js";

export const Exit = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  AUTH: 3,
  NOT_FOUND: 4,
  RATE_LIMIT: 5,
  CONFIRM: 6,
  DRY_RUN: 7,
  UPSTREAM: 64,
  SIGINT: 130,
  SIGPIPE: 141
} as const;

export function argvHas(flag: string): boolean {
  return process.argv.includes(flag);
}

export function useColor(): boolean {
  if (argvHas("--no-color")) return false;
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stdout.isTTY);
}

export type OutputMode = "json" | "ndjson" | "text";

export function outputMode(): OutputMode {
  if (argvHas("--json") || process.env.MYMIND_OUTPUT === "json") return "json";
  if (argvHas("--ndjson") || process.env.MYMIND_OUTPUT === "ndjson") return "ndjson";
  if (argvHas("--text") || process.env.MYMIND_OUTPUT === "text") return "text";
  if (!process.stdout.isTTY) return "json";
  return "text";
}

export function printEnvelope(
  kind: string,
  data: unknown,
  rateLimit: unknown,
  warnings: string[] = []
): void {
  const envelope = { v: 1, kind, data, rateLimit, warnings };
  const mode = outputMode();
  if (mode === "json") {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  } else if (mode === "ndjson") {
    process.stdout.write(`${JSON.stringify(envelope)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }
}

export function handleCliError(error: unknown): never {
  if (error instanceof MyMindApiError) {
    const api = error;
    const code =
      api.status === 401 || api.status === 403
        ? Exit.AUTH
        : api.status === 404
          ? Exit.NOT_FOUND
          : api.status === 429
            ? Exit.RATE_LIMIT
            : Exit.UPSTREAM;
    process.stderr.write(`${api.message}\n`);
    process.exit(code);
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(Exit.GENERIC);
}

export function requireConfirm(yes: boolean | undefined, message: string): void {
  if (process.env.MYMIND_AUTO_CONFIRM === "1") return;
  if (!yes) {
    process.stderr.write(`${message}\n`);
    process.exit(Exit.CONFIRM);
  }
}

export function requireConfirmDelete(
  yes: boolean | undefined,
  yesDelete: boolean | undefined,
  msg: string
): void {
  if (process.env.MYMIND_AUTO_CONFIRM === "1") return;
  if (!yes || !yesDelete) {
    process.stderr.write(`${msg}\n`);
    process.exit(Exit.CONFIRM);
  }
}
