import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface CliConfigFile {
  output_format?: "json" | "ndjson" | "text" | "compact" | undefined;
  auto_confirm?: boolean | undefined;
  output_dir?: string | undefined;
  retry_max?: number | undefined;
  log_format?: "text" | "json" | undefined;
}

export function defaultConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "mymind", "config.json");
}

export async function loadCliConfigFile(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): Promise<CliConfigFile> {
  if (argv.includes("--no-config")) return {};
  const configFlag = argv.indexOf("--config");
  const path = configFlag >= 0 ? argv[configFlag + 1] : defaultConfigPath(env);
  if (!path) return {};
  try {
    const raw = await readFile(resolve(path), "utf8");
    return JSON.parse(raw) as CliConfigFile;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function applyCliConfigFile(argv: string[] = process.argv): Promise<void> {
  const config = await loadCliConfigFile(argv);
  if (config.output_format && process.env.MYMIND_OUTPUT === undefined) process.env.MYMIND_OUTPUT = config.output_format;
  if (config.auto_confirm === true && process.env.MYMIND_AUTO_CONFIRM === undefined) process.env.MYMIND_AUTO_CONFIRM = "1";
  if (config.output_dir && process.env.MYMIND_OUTPUT_DIR === undefined) process.env.MYMIND_OUTPUT_DIR = config.output_dir;
  if (config.retry_max !== undefined && process.env.MYMIND_RETRY_MAX === undefined) {
    process.env.MYMIND_RETRY_MAX = String(config.retry_max);
  }
  if (config.log_format && process.env.MYMIND_LOG_FORMAT === undefined) process.env.MYMIND_LOG_FORMAT = config.log_format;
}

