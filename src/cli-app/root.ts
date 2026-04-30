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
import { loadConfig } from "../config.js";
import { InstallHelp, runInstallCommand } from "../install.js";
import { runMcpStdioServer } from "../mcp-stdio.js";
import { objectsRootCommand, objectsGetCommand, runObjectsListShortcut } from "./commands/objects.js";
import { spacesRootCommand } from "./commands/spaces.js";
import { tagsRootCommand } from "./commands/tags.js";
import { CLI_MANIFEST } from "./manifest-data.js";
import { handleCliError, printEnvelope, requireConfirm, Exit } from "./io.js";
import { parseOptionalLimit } from "./limits.js";
import { SEARCH_SYNTAX_REFERENCE } from "./search-syntax.js";
import { withClient } from "./run-client.js";
import { readStdinAll } from "./stdin.js";

function readPkgVersion(): string {
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "../../package.json");
    const pkg = JSON.parse(readFileSync(path, "utf8")) as { version?: string };
    return pkg.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
}

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
  meta: { name: "search", description: "Search mymind (GET /search)" },
  args: {
    syntax: { type: "boolean", description: "Print search DSL reference" },
    q: { type: "positional", description: "Query string", required: false },
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
      if (!q && !similarTo) throw new Error("Provide a query argument, --similar-to <uid>, or --syntax");
      if (args.semantic || args.rerank) {
        requireConfirm(
          args.yesCost,
          "Semantic/rerank search requires --yes-cost or MYMIND_AUTO_CONFIRM=1."
        );
      }
      await withClient(async (client) => {
        const result = await client.search({
          q: q ?? "",
          similarTo,
          limit: parseOptionalLimit(args.limit),
          semantic: args.semantic,
          rerank: args.rerank
        });
        printEnvelope("search", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const loginCommand = defineCommand({
  meta: { name: "login", description: "Save MYMIND_KID and MYMIND_SECRET to ~/.config/mymind/credentials.json" },
  args: {
    kid: { type: "string", description: "Access key id" },
    secret: { type: "string", description: "Access key secret (base64)" }
  },
  async run({ args }) {
    try {
      const kid = args.kid ?? process.env.MYMIND_KID;
      const secret = args.secret ?? process.env.MYMIND_SECRET;
      if (!kid || !secret) throw new Error("Provide --kid and --secret or set MYMIND_KID and MYMIND_SECRET");
      await writeCredentialsFile(kid, secret);
      printEnvelope("login", { saved: true }, {});
    } catch (error) {
      handleCliError(error);
    }
  }
});

const logoutCommand = defineCommand({
  meta: { name: "logout", description: "Remove saved credentials file" },
  async run() {
    try {
      await deleteCredentialsFile();
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
      const envKid = process.env.MYMIND_KID;
      const config = await loadConfig();
      const fileCreds = await tryLoadCredentialsFromFile();
      const source = envKid ? "env" : fileCreds ? "file" : "unknown";
      printEnvelope("whoami", { kid: config.kid, source }, {});
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
        printEnvelope("save", { ...result.data, httpStatus: result.httpStatus }, result.rateLimit);
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
        printEnvelope("note", { ...result.data, httpStatus: result.httpStatus }, result.rateLimit);
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
        printEnvelope("capture", { ...result.data, httpStatus: result.httpStatus }, result.rateLimit);
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
  subCommands: {
    search: searchCommand,
    manifest: manifestCommand,
    login: loginCommand,
    logout: logoutCommand,
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
    objects: objectsRootCommand,
    spaces: spacesRootCommand,
    tags: tagsRootCommand,
    convert: convertCommand
  }
});

/** Entry for the citty CLI; `argv` should be `process.argv` (slice(2) is applied internally). */
export function runCli(argv: string[] = process.argv): Promise<void> {
  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(Exit.SIGPIPE);
  });
  return runMain(rootCommand, { rawArgs: argv.slice(2) });
}
