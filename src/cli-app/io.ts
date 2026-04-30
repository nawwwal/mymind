import { MyMindApiError } from "../mymind/client.js";
import { Exit, exitCodeForApiError } from "../actions/errors.js";
import { log } from "./logger.js";

export { Exit } from "../actions/errors.js";

export function argvHas(flag: string): boolean {
  return process.argv.includes(flag);
}

export function useColor(): boolean {
  if (argvHas("--no-color")) return false;
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stdout.isTTY);
}

export type OutputMode = "json" | "ndjson" | "text" | "compact";

export function outputMode(): OutputMode {
  if (argvHas("--json") || process.env.MYMIND_OUTPUT === "json") return "json";
  if (argvHas("--ndjson") || process.env.MYMIND_OUTPUT === "ndjson") return "ndjson";
  if (argvHas("--text") || process.env.MYMIND_OUTPUT === "text") return "text";
  if (argvHas("--compact") || process.env.MYMIND_OUTPUT === "compact") return "compact";
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
  } else if (mode === "compact") {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  } else if (mode === "ndjson") {
    process.stdout.write(`${JSON.stringify(envelope)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }
}

export function printListEnvelope(kind: string, data: unknown, rateLimit: unknown, warnings: string[] = []): void {
  if (outputMode() === "ndjson" && Array.isArray(data)) {
    for (const item of data) {
      process.stdout.write(`${JSON.stringify({ v: 1, kind, data: item, rateLimit, warnings })}\n`);
    }
    return;
  }
  printEnvelope(kind, data, rateLimit, warnings);
}

export function decorateCreateResult<T extends Record<string, unknown>>(
  data: T,
  httpStatus: number | undefined
): T & { httpStatus?: number | undefined; bumped?: boolean | undefined; previousBumped?: unknown } {
  const out: T & { httpStatus?: number | undefined; bumped?: boolean | undefined; previousBumped?: unknown } = { ...data };
  if (httpStatus !== undefined) out.httpStatus = httpStatus;
  if (httpStatus === 200) {
    out.bumped = true;
    out.previousBumped = data.bumped;
  }
  return out;
}

export interface CliErrorInfo {
  code: string;
  exitCode: number;
  message: string;
  hint?: string | undefined;
  docs?: string | undefined;
  retryAfterSeconds?: number | undefined;
}

export function handleCliError(error: unknown): never {
  const info = cliErrorInfo(error);
  if (outputMode() === "json" || process.env.MYMIND_LOG_FORMAT === "json") {
    process.stderr.write(`${JSON.stringify(info)}\n`);
  } else {
    process.stderr.write(`Error: ${info.message}\n`);
    if (info.hint) process.stderr.write(`Hint: ${info.hint}\n`);
    process.stderr.write(`Code: ${info.code} · Exit: ${info.exitCode}${info.docs ? ` · Docs: ${info.docs}` : ""}\n`);
  }
  process.exit(info.exitCode);
}

export enum ConfirmTier {
  Write = "write",
  Delete = "delete",
  Replace = "replace",
  HighCost = "high-cost"
}

export function cliErrorInfo(error: unknown): CliErrorInfo {
  if (error instanceof MyMindApiError) {
    const exitCode = exitCodeForApiError(error);
    const code = exitCode === Exit.AUTH
      ? "AUTH_INVALID"
      : exitCode === Exit.NOT_FOUND
        ? "NOT_FOUND"
        : exitCode === Exit.RATE_LIMIT
          ? "RATE_LIMITED"
          : "UPSTREAM_ERROR";
    return {
      code,
      exitCode,
      message: error.message,
      hint: hintForCode(code),
      retryAfterSeconds: error.retryAfterSeconds,
      docs: docsForCode(code)
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: "GENERIC_ERROR", exitCode: Exit.GENERIC, message, hint: "Run with --verbose for more context." };
}

export function installProcessErrorHandlers(): void {
  const onBug = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    log({
      level: "error",
      code: "BUG_UNHANDLED",
      msg: "Unexpected mymind CLI failure.",
      hint: "Please open an issue with the command, version, and redacted error.",
      issueUrl: `https://github.com/nawwwal/mymind-mcp/issues/new?title=${encodeURIComponent("Unexpected mymind CLI failure")}&body=${encodeURIComponent(message)}`
    });
    process.exit(Exit.GENERIC);
  };
  process.once("unhandledRejection", onBug);
  process.once("uncaughtException", onBug);
}

function hintForCode(code: string): string | undefined {
  if (code === "AUTH_INVALID") return "Run `mymind login`, or set MYMIND_KID and MYMIND_SECRET.";
  if (code === "RATE_LIMITED") return "Wait for the retry window or reduce high-cost operations.";
  if (code === "NOT_FOUND") return "Check the object or space id and try again.";
  if (code === "UPSTREAM_ERROR") return "The mymind API returned an unexpected error.";
  return undefined;
}

function docsForCode(code: string): string | undefined {
  if (code === "AUTH_INVALID") return "docs/auth.md";
  if (code === "RATE_LIMITED") return "docs/error-codes.md";
  return undefined;
}

export function requireConfirm(yes: boolean | undefined, message: string): void {
  if (process.env.MYMIND_AUTO_CONFIRM === "1") return;
  if (process.argv.includes("--no-input")) process.env.MYMIND_NO_INPUT = "1";
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
  if (process.argv.includes("--no-input")) process.env.MYMIND_NO_INPUT = "1";
  if (!yes || !yesDelete) {
    process.stderr.write(`${msg}\n`);
    process.exit(Exit.CONFIRM);
  }
}

export function requireConfirmReplace(
  yes: boolean | undefined,
  yesReplace: boolean | undefined,
  msg: string
): void {
  if (process.env.MYMIND_AUTO_CONFIRM === "1") return;
  if (process.argv.includes("--no-input")) process.env.MYMIND_NO_INPUT = "1";
  if (!yes || !yesReplace) {
    process.stderr.write(`${msg}\n`);
    process.exit(Exit.CONFIRM);
  }
}

export function exitDryRun(kind: string, preview: unknown): never {
  printEnvelope(kind, { dryRun: true, preview }, {});
  process.exit(Exit.DRY_RUN);
}
