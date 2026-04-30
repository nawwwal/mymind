import type { MymindToolName } from "../tools/tool-input-schemas.js";
import { MYMIND_TOOL_NAMES_ORDERED } from "../tools/tool-input-schemas.js";

/** MCP tool names (same order as `MYMIND_TOOL_NAMES_ORDERED` / `MYMIND_TOOL_INPUT_SCHEMAS`). */
export const MCP_TOOL_NAMES: readonly MymindToolName[] = MYMIND_TOOL_NAMES_ORDERED;

/** CLI exit codes (`src/actions/errors.ts`); mirrored here for agent manifests. */
export const CLI_EXIT_CODES = {
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

export const CLI_ENV_VARS = [
  { name: "MYMIND_KID", summary: "Access key id" },
  { name: "MYMIND_SECRET", summary: "Access key secret (base64)" },
  { name: "MYMIND_API_BASE", summary: "API base URL (default https://api.mymind.com)" },
  { name: "MYMIND_USER_AGENT", summary: "Override User-Agent for API requests" },
  { name: "MYMIND_ALLOWED_FILE_ROOTS", summary: "Comma-separated roots allowed for uploads (MCP/CLI)" },
  { name: "MYMIND_OUTPUT_DIR", summary: "Directory for MCP download writes" },
  { name: "MYMIND_OUTPUT", summary: "CLI output shape: json | ndjson | text" },
  { name: "MYMIND_AUTO_CONFIRM", summary: 'Set to "1" to skip interactive cost confirmations in CLI' },
  { name: "XDG_CONFIG_HOME", summary: "Overrides config dir for ~/.config/mymind/credentials.json" }
] as const;

export const CLI_ERROR_CODES = [
  { code: "AUTH_INVALID", exitCode: CLI_EXIT_CODES.AUTH, hint: "Run `mymind login` or set MYMIND_KID and MYMIND_SECRET." },
  { code: "NOT_FOUND", exitCode: CLI_EXIT_CODES.NOT_FOUND, hint: "Check the id and try again." },
  { code: "RATE_LIMITED", exitCode: CLI_EXIT_CODES.RATE_LIMIT, hint: "Wait for the retry window or reduce high-cost calls." },
  { code: "UPSTREAM_ERROR", exitCode: CLI_EXIT_CODES.UPSTREAM, hint: "The mymind API returned an unexpected error." },
  { code: "GENERIC_ERROR", exitCode: CLI_EXIT_CODES.GENERIC, hint: "Run with --verbose for more context." }
] as const;

type CommandEntry = {
  path: string[];
  summary: string;
  tier: string;
  needsConfirmCost?: true;
};

function outputKind(path: readonly string[]): string {
  return path.join(".");
}

function enrichCommands(commands: CommandEntry[]) {
  return commands.map((command) => ({
    ...command,
    args: [],
    flags: [
      { name: "--json", type: "boolean" },
      { name: "--ndjson", type: "boolean" },
      { name: "--compact", type: "boolean" }
    ],
    stdin: { accepts: command.path.includes("tag") || command.path.includes("rm") ? "ids" : "none" },
    stdout: { kind: outputKind(command.path), schemaRef: "docs/output-schemas/envelope.schema.json" },
    exitCodes: [0, 1, 3, 4, 5, 6, 64],
    examples: [`docs/examples/${outputKind(command.path)}.json`],
    mcpEquivalent: command.path[0] === "objects" ? undefined : undefined
  }));
}

/** Minimal manifest for agents; extend as verbs stabilize. */
export const CLI_MANIFEST = {
  v: 1,
  schemaVersion: 1,
  name: "mymind",
  description: "CLI and MCP bridge for the unofficial mymind API",
  commands: enrichCommands([
    { path: ["search"], summary: "Search mymind", tier: "read" },
    { path: ["ls"], summary: "List objects (shortcut)", tier: "read" },
    { path: ["get"], summary: "Get object (shortcut)", tier: "read" },
    { path: ["save"], summary: "Create object from URL", tier: "write", needsConfirmCost: true },
    { path: ["note"], summary: "Create note from stdin", tier: "write", needsConfirmCost: true },
    { path: ["capture"], summary: "Upload file", tier: "write", needsConfirmCost: true },
    { path: ["objects", "ls"], summary: "List objects", tier: "read" },
    { path: ["objects", "get"], summary: "Get object", tier: "read" },
    { path: ["objects", "create"], summary: "Create object (url, body, file)", tier: "write", needsConfirmCost: true },
    { path: ["objects", "update"], summary: "Update object metadata", tier: "write", needsConfirmCost: true },
    { path: ["objects", "rm"], summary: "Soft-delete objects", tier: "write", needsConfirmCost: true },
    { path: ["objects", "restore"], summary: "Restore soft-deleted objects", tier: "write", needsConfirmCost: true },
    { path: ["objects", "pin"], summary: "Pin objects", tier: "write", needsConfirmCost: true },
    { path: ["objects", "unpin"], summary: "Unpin objects", tier: "write", needsConfirmCost: true },
    { path: ["objects", "download"], summary: "Download object blob", tier: "read" },
    { path: ["objects", "content"], summary: "Fetch object content", tier: "read" },
    { path: ["objects", "replace"], summary: "Replace note content", tier: "write", needsConfirmCost: true },
    { path: ["objects", "related"], summary: "Related objects (high cost)", tier: "read", needsConfirmCost: true },
    { path: ["objects", "tag"], summary: "Add tags to objects", tier: "write", needsConfirmCost: true },
    { path: ["objects", "link-spaces"], summary: "Add objects to spaces", tier: "write", needsConfirmCost: true },
    { path: ["objects", "thumbnail"], summary: "Fetch thumbnail", tier: "read" },
    { path: ["objects", "search"], summary: "Search under objects namespace", tier: "read" },
    { path: ["spaces", "ls"], summary: "List spaces", tier: "read" },
    { path: ["spaces", "get"], summary: "Get space", tier: "read" },
    { path: ["spaces", "create"], summary: "Create space", tier: "write", needsConfirmCost: true },
    { path: ["spaces", "update"], summary: "Update space", tier: "write", needsConfirmCost: true },
    { path: ["spaces", "rm"], summary: "Delete space shell", tier: "write", needsConfirmCost: true },
    { path: ["spaces", "add"], summary: "Add object to space", tier: "write", needsConfirmCost: true },
    { path: ["spaces", "remove"], summary: "Remove object from space", tier: "write", needsConfirmCost: true },
    { path: ["tags", "ls"], summary: "List tags", tier: "read" },
    { path: ["convert"], summary: "Convert content", tier: "read" },
    { path: ["login"], summary: "Save credentials (file or macOS keychain)", tier: "auth" },
    { path: ["logout"], summary: "Remove saved credentials (file + keychain)", tier: "auth" },
    { path: ["auth", "status"], summary: "Credential layers (env / file / keychain)", tier: "auth" },
    { path: ["whoami"], summary: "Show active kid / resolution source", tier: "read" },
    { path: ["install"], summary: "Configure MCP clients", tier: "setup" },
    { path: ["mcp"], summary: "Start MCP stdio server", tier: "setup" },
    { path: ["manifest"], summary: "Print machine-readable CLI manifest", tier: "setup" }
  ]),
  mcpTools: [...MCP_TOOL_NAMES],
  exitCodes: CLI_EXIT_CODES,
  errorCodes: [...CLI_ERROR_CODES],
  envVars: [...CLI_ENV_VARS],
  outputSchemas: {
    envelope: "docs/output-schemas/envelope.schema.json",
    compact: "docs/output-schemas/compact.schema.json"
  }
} as const;
