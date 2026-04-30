import { readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import { assertAllowedPath } from "../actions/paths.js";
import {
  deleteCredentialsFile,
  tryLoadCredentialsFromFile,
  writeCredentialsFile
} from "../auth/credentials-file.js";
import {
  deleteCredentialsFromKeychain,
  describeCredentialLayers,
  writeCredentialsToKeychain
} from "../auth/store.js";
import { jwtValiditySecondsFromEnv, loadConfig } from "../config.js";
import { InstallHelp, runInstallCommand } from "../install.js";
import { runMcpStdioServer } from "../mcp-stdio.js";
import { MyMindClient } from "../mymind/index.js";
import { applyCliConfigFile } from "./config-file.js";
import { objectsRootCommand, objectsGetCommand, runObjectsListShortcut } from "./commands/objects.js";
import { spacesRootCommand } from "./commands/spaces.js";
import { tagsRootCommand } from "./commands/tags.js";
import { CLI_MANIFEST } from "./manifest-data.js";
import { decorateCreateResult, handleCliError, installProcessErrorHandlers, outputMode, printEnvelope, printListEnvelope, requireConfirm, Exit } from "./io.js";
import { parseOptionalLimit } from "./limits.js";
import { parseSearchIntent } from "./search-intent.js";
import { SEARCH_SYNTAX_REFERENCE } from "./search-syntax.js";
import { withClient } from "./run-client.js";
import { readStdinAll, readStdinLines } from "./stdin.js";

function readPkgVersion(): string {
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "../../package.json");
    const pkg = JSON.parse(readFileSync(path, "utf8")) as { version?: string };
    return pkg.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
}

const authStatusCommand = defineCommand({
  meta: { name: "status", description: "Show credential layers (env, file, macOS keychain)" },
  async run() {
    try {
      const fileCreds = await tryLoadCredentialsFromFile();
      const { layers, effective } = describeCredentialLayers(process.env, Boolean(fileCreds));
      printEnvelope("auth.status", { layers, effective: effective ?? null }, {});
    } catch (error) {
      handleCliError(error);
    }
  }
});

const authRootCommand = defineCommand({
  meta: { name: "auth", description: "Credential helpers" },
  subCommands: {
    status: authStatusCommand
  }
});

const manifestCommand = defineCommand({
  meta: { name: "manifest", description: "Print machine-readable CLI manifest (JSON)" },
  args: {
    schemaVersion: {
      type: "boolean",
      description: "Print schema version only",
      alias: ["s"]
    }
  },
  async run({ args }) {
    const v = readPkgVersion();
    const body =
      args.schemaVersion === true ? { schemaVersion: CLI_MANIFEST.schemaVersion } : { ...CLI_MANIFEST, version: v };
    process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
  }
});

const searchCommand = defineCommand({
  meta: { name: "search", description: "Search mymind" },
  args: {
    q: { type: "positional", description: "Query string", required: false },
    query: { type: "string", description: "Raw MyMind search DSL query" },
    tag: { type: "string", description: "Tag filter; repeat or comma-separate", alias: ["tags"] },
    type: { type: "string", description: "Object type filter" },
    domain: { type: "string", description: "Domain filter" },
    title: { type: "string", description: "Title filter" },
    completed: { type: "string", description: "completed:true or completed:false" },
    action: { type: "string", description: "Action filter: read, watch, make, purchase" },
    syntax: { type: "boolean", description: "Print search DSL reference" },
    limit: { type: "string", description: "Max results (default 20)", valueHint: "n" },
    semantic: { type: "boolean", description: "Semantic search" },
    rerank: { type: "boolean", description: "Rerank (Mastermind)" },
    similarTo: { type: "string", description: "Uid for similar-to search", alias: ["similar-to"] },
    yesCost: { type: "boolean", description: "Confirm credit spend for semantic/rerank", alias: ["yes-cost"] }
  },
  async run({ args }) {
    try {
      if (args.syntax === true) {
        process.stdout.write(`${SEARCH_SYNTAX_REFERENCE}\n`);
        return;
      }
      const q = args.q as string | undefined;
      const similarTo = args.similarTo as string | undefined;
      const intent = similarTo
        ? { query: q ?? "", warnings: [] }
        : parseSearchIntent({
          q,
          query: args.query as string | undefined,
          tags: parseRepeatedValues(args.tag as string | string[] | undefined),
          type: args.type as string | undefined,
          domain: args.domain as string | undefined,
          title: args.title as string | undefined,
          completed: args.completed as string | undefined,
          action: args.action as string | undefined
        });
      if (args.semantic || args.rerank) {
        requireConfirm(
          args.yesCost,
          "Semantic/rerank search requires --yes-cost or MYMIND_AUTO_CONFIRM=1."
        );
      }
      await withClient(async (client) => {
        const result = await client.search({
          q: intent.query,
          similarTo,
          limit: parseOptionalLimit(args.limit),
          semantic: args.semantic,
          rerank: args.rerank
        });
        printSearchHint(intent.query, intent.interpretedFrom);
        printListEnvelope("search", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const tagCommand = defineCommand({
  meta: { name: "tag", description: "Add tags to objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    tag: { type: "string", description: "Tag name; repeat or comma-separate", required: true, alias: ["tags"] },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const tags = parseRepeatedValues(args.tag as string | string[] | undefined).map((name) => ({ name }));
      if (tags.length === 0) throw new Error("Provide at least one tag. Example: mymind tag <object-id> --tag reading");
      const ids = await idsFromArgOrStdin(args.id as string | undefined, "Provide <object-id> or pipe object ids on stdin");
      if (args.dryRun === true) {
        printEnvelope("tag", { dryRun: true, preview: { ids, tags } }, {});
        process.exit(Exit.DRY_RUN);
      }
      requireConfirm(args.yes, "Tagging requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const objectId of ids) {
          const result = await client.addObjectTags(objectId, tags);
          printEnvelope("tag", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const moveCommand = defineCommand({
  meta: { name: "move", description: "Add objects to a space" },
  args: {
    objectId: { type: "positional", description: "Object uid", required: false },
    space: { type: "string", description: "Space uid", required: true },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const spaceId = args.space as string;
      const objectIds = await idsFromArgOrStdin(args.objectId as string | undefined, "Provide <object-id> or pipe object ids on stdin");
      if (args.dryRun === true) {
        printEnvelope("move", { dryRun: true, preview: { objectIds, spaceId } }, {});
        process.exit(Exit.DRY_RUN);
      }
      requireConfirm(args.yes, "Adding objects to a space requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const objectId of objectIds) {
          const result = await client.addObjectToSpace(spaceId, objectId);
          printEnvelope("move", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Save credentials to ~/.config/mymind/credentials.json or macOS keychain"
  },
  args: {
    kid: { type: "string", description: "Access key id" },
    secret: { type: "string", description: "Access key secret (base64)" },
    store: {
      type: "string",
      description: "file (default), keychain (macOS), or none (validate only)",
      valueHint: "file|keychain|none"
    },
    profile: { type: "string", description: "Reserved profile name" }
  },
  async run({ args }) {
    try {
      const kid = args.kid ?? process.env.MYMIND_KID;
      const secret = args.secret ?? process.env.MYMIND_SECRET;
      if (!kid || !secret) throw new Error("Provide --kid and --secret or set MYMIND_KID and MYMIND_SECRET");
      if (args.profile !== undefined) throw new Error("--profile is reserved for multi-profile support in v1.x.");
      const store = ((args.store as string | undefined) ?? "file").toLowerCase();
      if (store !== "file" && store !== "keychain" && store !== "none") {
        throw new Error('Invalid --store (use file, keychain, or none)');
      }
      const probeOptions: ConstructorParameters<typeof MyMindClient>[0] = {
        kid,
        secret,
        userAgent: "mymind-login",
        jwtValiditySeconds: jwtValiditySecondsFromEnv(process.env)
      };
      if (process.env.MYMIND_API_BASE !== undefined) probeOptions.apiBaseUrl = process.env.MYMIND_API_BASE;
      const probe = new MyMindClient(probeOptions);
      await probe.whoami();
      if (store === "keychain") {
        writeCredentialsToKeychain(kid, secret);
      } else if (store === "file") {
        await writeCredentialsFile(kid, secret);
      }
      printEnvelope("login", { saved: store !== "none", store, lastValidatedAt: new Date().toISOString() }, {});
    } catch (error) {
      handleCliError(error);
    }
  }
});

const logoutCommand = defineCommand({
  meta: { name: "logout", description: "Remove saved credentials (file and macOS keychain entry)" },
  async run() {
    try {
      await deleteCredentialsFile();
      deleteCredentialsFromKeychain();
      printEnvelope("logout", { removed: true }, {});
    } catch (error) {
      handleCliError(error);
    }
  }
});

const whoamiCommand = defineCommand({
  meta: { name: "whoami", description: "Show active credential kid and resolution source" },
  async run() {
    try {
      const fileCreds = await tryLoadCredentialsFromFile();
      const { layers, effective } = describeCredentialLayers(process.env, Boolean(fileCreds));
      const config = await loadConfig();
      printEnvelope(
        "whoami",
        { kid: config.kid, source: effective ?? "unknown", layers },
        {}
      );
    } catch (error) {
      handleCliError(error);
    }
  }
});

const installCliCommand = defineCommand({
  meta: { name: "install", description: "Install MCP config for Claude/Codex/Cursor" },
  async run() {
    try {
      const idx = process.argv.indexOf("install");
      await runInstallCommand(process.argv.slice(idx + 1));
    } catch (error) {
      if (error instanceof InstallHelp) {
        process.stdout.write(error.message);
        return;
      }
      handleCliError(error);
    }
  }
});

const mcpCliCommand = defineCommand({
  meta: { name: "mcp", description: "Run MCP server on stdio" },
  async run() {
    try {
      await runMcpStdioServer();
    } catch (error) {
      handleCliError(error);
    }
  }
});

const convertCommand = defineCommand({
  meta: { name: "convert", description: "Convert between text/plain, markdown, prose" },
  args: {
    from: { type: "string", description: "MIME type", required: true },
    to: { type: "string", description: "MIME type", required: true },
    body: { type: "positional", description: "Content (optional; else stdin)", required: false }
  },
  async run({ args }) {
    try {
      let content: string | Record<string, unknown> = (args.body as string | undefined) ?? "";
      if (content === "") content = await readStdinAll();
      const from = args.from as "text/plain" | "text/markdown" | "application/prose+json";
      const to = args.to as "text/plain" | "text/markdown" | "application/prose+json";
      if (from === to) throw new Error("from and to must differ");
      await withClient(async (client) => {
        const result = await client.convert({ content, from, to });
        printEnvelope("convert", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const saveCommand = defineCommand({
  meta: { name: "save", description: "Create object from URL" },
  args: {
    url: { type: "positional", description: "URL to save", required: true },
    title: { type: "string", description: "Title" },
    yesCost: { type: "boolean", description: "Confirm create cost", alias: ["yes-cost"] }
  },
  async run({ args }) {
    try {
      requireConfirm(
        args.yesCost,
        "Creating objects can incur credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1."
      );
      await withClient(async (client) => {
        const result = await client.createObject({
          url: args.url as string,
          title: args.title as string | undefined
        });
        printEnvelope("save", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const noteCommand = defineCommand({
  meta: { name: "note", description: "Create note from stdin (markdown)" },
  args: {
    title: { type: "string", description: "Title" },
    yesCost: { type: "boolean", description: "Confirm create cost", alias: ["yes-cost"] }
  },
  async run({ args }) {
    try {
      requireConfirm(
        args.yesCost,
        "Creating notes can incur credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1."
      );
      const body = await readStdinAll();
      await withClient(async (client) => {
        const result = await client.createObject({
          title: args.title as string | undefined,
          content: { type: "text/markdown", body }
        });
        printEnvelope("note", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const captureCommand = defineCommand({
  meta: { name: "capture", description: "Upload a local file" },
  args: {
    file: { type: "positional", description: "Path to file", required: true },
    mimeType: { type: "string", description: "MIME type override", alias: ["mime-type"] },
    yesCost: { type: "boolean", description: "Confirm create cost", alias: ["yes-cost"] }
  },
  async run({ args }) {
    try {
      requireConfirm(args.yesCost, "Uploads can incur credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client, config) => {
        const rawPath = args.file as string;
        const uploadPath = await assertAllowedPath(rawPath, config.allowedFileRoots);
        const stats = await stat(uploadPath);
        if (!stats.isFile()) throw new Error(`Not a file: ${rawPath}`);
        const result = await client.createObjectFromFile(uploadPath, {
          mimeType: args.mimeType as string | undefined
        });
        printEnvelope("capture", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

export const rootCommand = defineCommand({
  meta: {
    name: "mymind",
    version: readPkgVersion(),
    description: "Unofficial CLI and MCP bridge for the mymind API"
  },
  args: {
    verbose: { type: "boolean", alias: ["v"], description: "Verbose stderr logging" },
    quiet: { type: "boolean", alias: ["q"], description: "Only errors on stderr" },
    logFormat: { type: "string", alias: ["log-format"], description: "text or json stderr logs" },
    noInput: { type: "boolean", alias: ["no-input"], description: "Never prompt interactively" },
    retryMax: { type: "string", alias: ["retry-max"], description: "Max retries for retryable requests" },
    noColor: { type: "boolean", alias: ["no-color"], description: "Disable color" },
    config: { type: "string", description: "Path to config JSON" },
    noConfig: { type: "boolean", alias: ["no-config"], description: "Skip config file" },
    pager: { type: "boolean", description: "Reserved opt-in pager flag" },
    profile: { type: "string", description: "Reserved for multi-profile support" }
  },
  subCommands: {
    search: searchCommand,
    manifest: manifestCommand,
    login: loginCommand,
    logout: logoutCommand,
    auth: authRootCommand,
    whoami: whoamiCommand,
    install: installCliCommand,
    mcp: mcpCliCommand,
    ls: defineCommand({
      meta: { name: "ls", description: "Shortcut: objects ls" },
      args: {
        limit: { type: "string", valueHint: "n" },
        since: { type: "string" }
      },
      async run({ args }) {
        try {
          await runObjectsListShortcut({ limit: args.limit, since: args.since });
        } catch (error) {
          handleCliError(error);
        }
      }
    }),
    get: objectsGetCommand,
    save: saveCommand,
    note: noteCommand,
    capture: captureCommand,
    tag: tagCommand,
    move: moveCommand,
    objects: objectsRootCommand,
    spaces: spacesRootCommand,
    tags: tagsRootCommand,
    convert: convertCommand
  }
});

/** Entry for the citty CLI; `argv` should be `process.argv` (slice(2) is applied internally). */
export function runCli(argv: string[] = process.argv): Promise<void> {
  installProcessErrorHandlers();
  const rawArgs = argv.slice(2);
  if (rawArgs.includes("--help") && rawArgs.includes("--json")) {
    const path = rawArgs.filter((arg) => !arg.startsWith("-"));
    const entry = CLI_MANIFEST.commands.find((command) => command.path.join(" ") === path.join(" "));
    process.stdout.write(`${JSON.stringify(entry ?? CLI_MANIFEST, null, 2)}\n`);
    return Promise.resolve();
  }
  const helpHandled = handleHelp(rawArgs);
  if (helpHandled !== undefined) return helpHandled;
  const suggestionHandled = handleSuggestion(rawArgs);
  if (suggestionHandled !== undefined) return suggestionHandled;
  if (argv.includes("--profile")) {
    process.stderr.write("Error: --profile is reserved for multi-profile support in v1.x.\n");
    process.exit(Exit.USAGE);
  }
  const controller = new AbortController();
  process.once("SIGINT", () => {
    controller.abort(new Error("Interrupted."));
    process.stderr.write("Cancelled\n");
    process.exit(Exit.SIGINT);
  });
  process.once("SIGTERM", () => {
    controller.abort(new Error("Terminated."));
    process.stderr.write("Terminated\n");
    process.exit(143);
  });
  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(Exit.SIGPIPE);
  });
  return applyCliConfigFile(argv).then(() => runMain(rootCommand, { rawArgs }));
}

function parseRepeatedValues(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);
}

async function idsFromArgOrStdin(fromArg: string | undefined, message: string): Promise<string[]> {
  const stdinIds = await readStdinLines();
  const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
  if (ids.length === 0) throw new Error(message);
  return ids;
}

function printSearchHint(query: string, interpretedFrom?: string | undefined): void {
  if (outputMode() !== "text") return;
  const prefix = interpretedFrom ? `Interpreted "${interpretedFrom}" as` : "Searching";
  process.stderr.write(`${prefix}: ${query}\n`);
}

function handleHelp(rawArgs: string[]): Promise<void> | undefined {
  if (rawArgs[0] === "help") {
    const topic = rawArgs.slice(1).filter((arg) => !arg.startsWith("-")).join(" ");
    const text = helpText(topic);
    if (text) {
      process.stdout.write(text);
      return Promise.resolve();
    }
    process.stderr.write(`Unknown help topic "${topic}".\nDid you mean: mymind help search?\n`);
    process.exit(Exit.USAGE);
  }

  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
    if (rawArgs.includes("--json")) return undefined;
    const path = rawArgs.filter((arg) => !arg.startsWith("-")).join(" ");
    const text = helpText(path);
    if (text) {
      process.stdout.write(text);
      return Promise.resolve();
    }
  }

  return undefined;
}

function handleSuggestion(rawArgs: string[]): Promise<void> | undefined {
  if (rawArgs[0] === "tags" && rawArgs[1] && !["ls", "--help", "-h"].includes(rawArgs[1])) {
    process.stderr.write(`Unknown command "mymind tags ${rawArgs[1]}".\nDid you mean: mymind search --tag ${rawArgs[1]}?\n`);
    process.exit(Exit.USAGE);
  }

  const command = rawArgs[0];
  if (command && !command.startsWith("-") && !(command in (rootCommand.subCommands ?? {}))) {
    process.stderr.write(`Unknown command "mymind ${command}".\nDid you mean: mymind search --tag reading?\n`);
    process.exit(Exit.USAGE);
  }

  return undefined;
}

function helpText(topic: string): string | undefined {
  if (topic === "") return TOP_LEVEL_HELP;
  if (topic === "search") return SEARCH_HELP;
  if (topic === "objects") return OBJECTS_HELP;
  if (topic === "tags") return TAGS_HELP;
  return undefined;
}

const TOP_LEVEL_HELP = `mymind - unofficial CLI and MCP bridge for the mymind API

Examples
  mymind search --tag reading
  mymind search "weekly review" --type note
  mymind save https://example.com --yes-cost
  mymind ls --since 7d

Usage
  mymind <command> [options]

Commands
  search      Search with friendly filters or MyMind DSL
  ls          List recent objects
  get         Get an object by id
  save        Save a URL
  note        Create a markdown note from stdin
  capture     Upload a local file
  tag         Add tags to objects
  move        Add objects to a space
  spaces      Manage spaces
  tags        List tags
  help        Show help

Use mymind help <command> for more information.
`;

const SEARCH_HELP = `Search mymind

Examples
  mymind search --tag reading
  mymind search "weekly review" --type note
  mymind search "#reading"
  mymind search "tags reading"
  mymind search "notes about design"
  mymind search "design systems" --type note --tag work

Usage
  mymind search [text] [--tag name] [--type type] [--domain host] [--title text]

Friendly filters
  --tag, --tags       Tag filter; repeat or comma-separate
  --type              Object type, for example note or url
  --domain            Domain filter
  --title             Title filter
  --completed         true or false
  --action            read, watch, make, or purchase
  --query             Raw MyMind search DSL

Other options
  --limit <n>         Max results
  --semantic          Semantic search
  --rerank            Rerank (Mastermind)
  --similar-to <id>   Find related content
  --yes-cost          Confirm semantic/rerank credit spend
  --syntax            Print raw DSL reference
`;

const OBJECTS_HELP = `Object commands

Examples
  mymind ls --since 7d
  mymind get <object-id>
  mymind tag <object-id> --tag reading --yes
  mymind move <object-id> --space <space-id> --yes

Prefer top-level search, tag, and move commands for everyday use.
`;

const TAGS_HELP = `Tag commands

Examples
  mymind tags
  mymind search --tag reading
  mymind tag <object-id> --tag reading --yes

Usage
  mymind tags [--limit n]
`;
