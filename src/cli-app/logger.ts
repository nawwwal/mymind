export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "text" | "json";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface LogEvent {
  level: LogLevel;
  msg: string;
  code?: string | undefined;
  hint?: string | undefined;
  docs?: string | undefined;
  [key: string]: unknown;
}

export function logFormat(): LogFormat {
  if (argvHas("--log-format=json") || process.env.MYMIND_LOG_FORMAT === "json" || argvHas("--json")) {
    return "json";
  }
  return "text";
}

export function minimumLogLevel(): LogLevel {
  if (argvHas("--quiet") || argvHas("-q")) return "error";
  if (argvHas("--verbose") || argvHas("-v") || process.env.MYMIND_DEBUG === "1") return "debug";
  return "warn";
}

export function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[minimumLogLevel()];
}

export function log(event: LogEvent): void {
  if (!shouldLog(event.level)) return;
  const redacted = redact(event) as LogEvent;
  if (logFormat() === "json") {
    process.stderr.write(`${JSON.stringify(redacted)}\n`);
  } else {
    const suffix = redacted.hint ? `\nHint: ${redacted.hint}` : "";
    process.stderr.write(`${redacted.level.toUpperCase()}: ${redacted.msg}${suffix}\n`);
  }
}

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    const secret = process.env.MYMIND_SECRET;
    let out = secret ? value.split(secret).join("[redacted]") : value;
    out = out.replace(/(MYMIND_(?:KID|SECRET)|kid|secret)=[^\s&]+/gi, "$1=[redacted]");
    return out;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        /SECRET|KID|secret|kid/i.test(key) ? "[redacted]" : redact(entry)
      ])
    );
  }
  return value;
}

function argvHas(flag: string): boolean {
  return process.argv.includes(flag);
}

