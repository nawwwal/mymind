import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { tryLoadCredentialsFromFile } from "./auth/credentials-file.js";

const SERVER_NAME = "mymind";
const DEFAULT_PACKAGE_SPEC = "@nawwal/mymind";
const DEFAULT_COMMAND = "mymind";

type ClientId = "claude-code" | "claude-desktop" | "codex" | "cursor";

interface Credentials {
  kid: string;
  secret: string;
}

interface ServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface InstallOptions {
  clients: ClientId[] | "auto";
  dryRun: boolean;
  yes: boolean;
  noInput: boolean;
  useBinOnly: boolean;
  scope: "user" | "local" | "project";
  packageSpec: string;
  homeDir: string;
  env: NodeJS.ProcessEnv;
  pathEnv: string;
}

interface InstallTarget {
  id: ClientId;
  label: string;
  reason: string;
  install(config: ServerConfig, options: InstallOptions): Promise<string>;
}

interface ParsedArgs {
  clients: ClientId[] | "auto";
  dryRun: boolean;
  yes: boolean;
  noInput: boolean;
  useBinOnly: boolean;
  scope: "user" | "local" | "project";
  packageSpec: string;
}

const CLIENT_IDS: ClientId[] = ["claude-code", "claude-desktop", "codex", "cursor"];

export async function runInstallCommand(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const options: InstallOptions = {
    ...parsed,
    homeDir: homedir(),
    env: process.env,
    pathEnv: process.env.PATH ?? ""
  };

  if (options.noInput && !options.yes && !options.dryRun) {
    throw new Error("Non-interactive install requires --yes (or use --dry-run).");
  }

  const config = createServerConfig(null, options.packageSpec, options.useBinOnly);
  const targets = await resolveTargets(options);

  if (targets.length === 0) {
    output.write("No supported MCP client was detected.\n\n");
    output.write("Supported targets: Claude Code, Claude Desktop, Codex, Cursor.\n");
    output.write("Run with --clients=codex or --clients=claude-desktop to install for a specific client.\n");
    return;
  }

  output.write(`Detected ${targets.length} target${targets.length === 1 ? "" : "s"}:\n`);
  for (const target of targets) {
    output.write(`- ${target.label}: ${target.reason}\n`);
  }

  if (!options.yes && !options.dryRun && !options.noInput) {
    const confirmed = await confirmInstallWrites("Install mymind MCP for these clients?");
    if (!confirmed) {
      output.write("No changes made.\n");
      return;
    }
  }

  for (const target of targets) {
    if (options.dryRun) {
      output.write(`[dry-run] Would install for ${target.label}.\n`);
      continue;
    }

    const result = await target.install(config, options);
    output.write(`${result}\n`);
  }

  output.write("\nRestart the configured MCP client before using the mymind tools.\n");
}

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    clients: "auto",
    dryRun: false,
    yes: false,
    noInput: false,
    useBinOnly: false,
    scope: "user",
    packageSpec: DEFAULT_PACKAGE_SPEC
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
      continue;
    }
    if (arg === "--no-input") {
      parsed.noInput = true;
      continue;
    }
    if (arg === "--use-bin-only") {
      parsed.useBinOnly = true;
      continue;
    }
    if (arg.startsWith("--clients=")) {
      parsed.clients = parseClients(arg.slice("--clients=".length));
      continue;
    }
    if (arg.startsWith("--scope=")) {
      parsed.scope = parseScope(arg.slice("--scope=".length));
      continue;
    }
    if (arg.startsWith("--package=")) {
      parsed.packageSpec = requireValue(arg.slice("--package=".length), "--package");
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      throw new InstallHelp();
    }
    throw new Error(`Unknown install option: ${arg}`);
  }

  return parsed;
}

export function createServerConfig(
  credentials: Credentials | null,
  packageSpec = DEFAULT_PACKAGE_SPEC,
  useBinOnly = false
): ServerConfig {
  void packageSpec;
  void useBinOnly;
  return {
    command: DEFAULT_COMMAND,
    args: ["mcp"],
    env: credentials?.kid && credentials.secret ? {
      MYMIND_KID: credentials.kid,
      MYMIND_SECRET: credentials.secret
    } : {}
  };
}

export async function updateClaudeDesktopConfig(path: string, serverConfig: ServerConfig): Promise<void> {
  const config = await readJsonObject(path);
  const mcpServers = isRecord(config.mcpServers) ? config.mcpServers : {};

  mcpServers[SERVER_NAME] = serverConfig;
  config.mcpServers = mcpServers;

  await writeJson(path, config);
}

export async function updateCursorConfig(path: string, serverConfig: ServerConfig): Promise<void> {
  await updateClaudeDesktopConfig(path, serverConfig);
}

export async function updateCodexConfig(path: string, serverConfig: ServerConfig): Promise<void> {
  const existing = await readTextIfExists(path);
  const envToml = codexEnvToml(serverConfig);
  const block = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = ${tomlString(serverConfig.command)}`,
    `args = ${tomlArray(serverConfig.args)}`,
    `env = ${envToml}`
  ].join("\n");

  const updated = replaceTomlSection(existing, `mcp_servers.${SERVER_NAME}`, block);
  await ensureParent(path);
  await writeFile(path, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
}

function codexEnvToml(serverConfig: ServerConfig): string {
  const entries = Object.entries(serverConfig.env).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) {
    return "{}";
  }
  return `{ ${entries.map(([k, v]) => `${k} = ${tomlString(v)}`).join(", ")} }`;
}

export function replaceTomlSection(source: string, sectionName: string, replacement: string): string {
  const lines = source.split(/\r?\n/);
  const header = `[${sectionName}]`;
  const start = lines.findIndex((line) => line.trim() === header);

  if (start === -1) {
    const prefix = source.trim().length > 0 ? `${source.trimEnd()}\n\n` : "";
    return `${prefix}${replacement}\n`;
  }

  let end = start + 1;
  while (end < lines.length && !/^\s*\[[^\]]+\]\s*$/.test(lines[end] ?? "")) {
    end += 1;
  }

  const nextLines = [...lines.slice(0, start), ...replacement.split("\n"), ...lines.slice(end)];
  return nextLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function getInstallHelp(): string {
  return `mymind install

Configure mymind MCP for detected local MCP clients.

Usage:
  mymind install [options]

Credentials:
  Run \`mymind login\` once before installing. The MCP server will resolve saved credentials
  from ~/.config/mymind/credentials.json, macOS Keychain, or MYMIND_KID/MYMIND_SECRET at runtime.

Options:
  --clients=auto|claude-code,claude-desktop,codex,cursor
  --scope=user|local|project       Claude Code scope. Defaults to user.
  --package=@nawwal/mymind         Deprecated; MCP configs use the installed \`mymind\` binary.
  --use-bin-only                   Deprecated; MCP configs already use the installed \`mymind\` binary.
  --dry-run                        Show detected targets without writing.
  --yes, -y                        Do not ask before writing.
  --no-input                       Fail instead of prompting (implies you must pass --yes for writes).
`;
}

export class InstallHelp extends Error {
  constructor() {
    super(getInstallHelp());
  }
}

async function resolveTargets(options: InstallOptions): Promise<InstallTarget[]> {
  const auto = options.clients === "auto";
  const requested: ClientId[] = options.clients === "auto" ? CLIENT_IDS : options.clients;
  const targets = await Promise.all(requested.map((client) => detectTarget(client, options, !auto)));
  return targets.filter((target): target is InstallTarget => target !== undefined);
}

async function detectTarget(
  client: ClientId,
  options: InstallOptions,
  explicit: boolean
): Promise<InstallTarget | undefined> {
  switch (client) {
    case "claude-code": {
      const claudePath = findCommand("claude", options.pathEnv);
      if (!claudePath) {
        return undefined;
      }
      return {
        id: client,
        label: "Claude Code",
        reason: `found ${claudePath}`,
        install: async (config, installOptions) => installClaudeCode(config, installOptions)
      };
    }
    case "claude-desktop": {
      const path = getClaudeDesktopConfigPath(options);
      if (!explicit && !existsSync(path) && !existsSync(dirname(path))) {
        return undefined;
      }
      return {
        id: client,
        label: "Claude Desktop",
        reason: existsSync(path) || existsSync(dirname(path)) ? `found ${dirname(path)}` : "requested explicitly",
        install: async (config) => {
          await updateClaudeDesktopConfig(path, config);
          return `Installed Claude Desktop config at ${path}.`;
        }
      };
    }
    case "codex": {
      const path = join(options.homeDir, ".codex", "config.toml");
      const codexPath = findCommand("codex", options.pathEnv);
      if (!explicit && !codexPath && !existsSync(path) && !existsSync(dirname(path))) {
        return undefined;
      }
      return {
        id: client,
        label: "Codex",
        reason: codexPath ? `found ${codexPath}` : existsSync(path) || existsSync(dirname(path)) ? `found ${dirname(path)}` : "requested explicitly",
        install: async (config) => {
          await updateCodexConfig(path, config);
          return `Installed Codex config at ${path}.`;
        }
      };
    }
    case "cursor": {
      const path = join(options.homeDir, ".cursor", "mcp.json");
      const cursorPath = findCommand("cursor", options.pathEnv);
      if (!explicit && !cursorPath && !existsSync(path) && !existsSync(dirname(path))) {
        return undefined;
      }
      return {
        id: client,
        label: "Cursor",
        reason: cursorPath ? `found ${cursorPath}` : existsSync(path) || existsSync(dirname(path)) ? `found ${dirname(path)}` : "requested explicitly",
        install: async (config) => {
          await updateCursorConfig(path, config);
          return `Installed Cursor config at ${path}.`;
        }
      };
    }
  }
}

async function installClaudeCode(config: ServerConfig, options: InstallOptions): Promise<string> {
  const args = ["mcp", "add", SERVER_NAME, "--scope", options.scope];
  for (const [key, value] of Object.entries(config.env)) {
    if (value !== undefined && value !== "") {
      args.push("--env", `${key}=${value}`);
    }
  }
  args.push("--", config.command, ...config.args);
  const result = spawnSync("claude", args, { encoding: "utf8", stdio: "pipe" });

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `exit code ${result.status ?? "unknown"}`;
    throw new Error(`Claude Code install failed: ${detail.trim()}`);
  }

  return `Installed Claude Code config with scope ${options.scope}.`;
}

async function getCredentials(env: NodeJS.ProcessEnv, noInput: boolean): Promise<Credentials> {
  const kid = env.MYMIND_KID?.trim();
  const secret = env.MYMIND_SECRET?.trim();

  if (kid && secret) {
    return { kid, secret };
  }

  const fromFile = await tryLoadCredentialsFromFile(env);
  if (fromFile?.kid && fromFile?.secret) {
    return { kid: fromFile.kid, secret: fromFile.secret };
  }

  if (
    noInput ||
    process.env.MYMIND_NO_INPUT === "1" ||
    process.argv.includes("--no-input") ||
    !input.isTTY ||
    !output.isTTY
  ) {
    throw new Error(
      "Set MYMIND_KID and MYMIND_SECRET, run `mymind login`, or run the installer interactively so it can prompt."
    );
  }

  const prompts = await import("@clack/prompts");

  let promptedKid = kid?.trim() ?? "";
  if (!promptedKid) {
    const answer = await prompts.text({
      message: "MYMIND_KID",
      placeholder: "kid_..."
    });
    if (prompts.isCancel(answer)) {
      throw new Error("Install cancelled.");
    }
    promptedKid = String(answer).trim();
  }

  let promptedSecret = secret?.trim() ?? "";
  if (!promptedSecret) {
    const answer = await prompts.password({
      message: "MYMIND_SECRET",
      mask: "*"
    });
    if (prompts.isCancel(answer)) {
      throw new Error("Install cancelled.");
    }
    promptedSecret = String(answer).trim();
  }

  if (!promptedKid || !promptedSecret) {
    throw new Error("Both MYMIND_KID and MYMIND_SECRET are required.");
  }

  return { kid: promptedKid, secret: promptedSecret };
}

async function confirmInstallWrites(message: string): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) return false;
  const prompts = await import("@clack/prompts");
  const ok = await prompts.confirm({ message, initialValue: true });
  if (prompts.isCancel(ok)) return false;
  return ok === true;
}

function parseClients(value: string): ClientId[] | "auto" {
  const normalized = requireValue(value, "--clients");
  if (normalized === "auto") {
    return "auto";
  }

  const clients = normalized.split(",").map((entry) => entry.trim()) as ClientId[];
  for (const client of clients) {
    if (!CLIENT_IDS.includes(client)) {
      throw new Error(`Unsupported client "${client}". Use one of: auto, ${CLIENT_IDS.join(", ")}.`);
    }
  }

  return [...new Set(clients)];
}

function parseScope(value: string): "user" | "local" | "project" {
  const normalized = requireValue(value, "--scope");
  if (normalized === "user" || normalized === "local" || normalized === "project") {
    return normalized;
  }
  throw new Error("Unsupported Claude Code scope. Use user, local, or project.");
}

function requireValue(value: string, option: string): string {
  if (!value.trim()) {
    throw new Error(`${option} requires a value.`);
  }
  return value.trim();
}

function getClaudeDesktopConfigPath(options: InstallOptions): string {
  if (platform() === "darwin") {
    return join(options.homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }

  if (platform() === "win32") {
    const appData = options.env.APPDATA ?? join(options.homeDir, "AppData", "Roaming");
    return join(appData, "Claude", "claude_desktop_config.json");
  }

  return join(options.homeDir, ".config", "Claude", "claude_desktop_config.json");
}

function findCommand(command: string, pathEnv: string): string | undefined {
  const extensions = platform() === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];

  for (const pathEntry of pathEnv.split(platform() === "win32" ? ";" : ":")) {
    if (!pathEntry) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = join(pathEntry, `${command}${extension}`);
      try {
        accessSyncExecutable(candidate);
        return candidate;
      } catch {
        // Keep searching PATH.
      }
    }
  }

  return undefined;
}

function accessSyncExecutable(path: string): void {
  accessSync(path, constants.X_OK);
}

async function readJsonObject(path: string): Promise<Record<string, unknown>> {
  const text = await readTextIfExists(path);
  if (!text.trim()) {
    return {};
  }

  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${path} must contain a JSON object.`);
  }

  return parsed;
}

async function writeJson(path: string, value: Record<string, unknown>): Promise<void> {
  await ensureParent(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readTextIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function tomlArray(values: string[]): string {
  return `[${values.map((value) => tomlString(value)).join(", ")}]`;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}
