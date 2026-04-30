import { stat, writeFile } from "node:fs/promises";
import { defineCommand } from "citty";
import { assertAllowedPath, assertOutputPath } from "../../actions/paths.js";
import type { ListOptions } from "../../mymind/client.js";
import {
  exitDryRun,
  handleCliError,
  decorateCreateResult,
  printEnvelope,
  printListEnvelope,
  requireConfirm,
  requireConfirmDelete,
  requireConfirmReplace
} from "../io.js";
import { parseOptionalLimit } from "../limits.js";
import { filterObjectsBySince, parseSinceCutoffMs } from "../since.js";
import { readStdinAll, readStdinLines } from "../stdin.js";
import { withClient } from "../run-client.js";

function parseCommaTags(raw: string): Array<{ name: string }> {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function parseCommaSpaceIds(raw: string): Array<{ id: string }> {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => ({ id }));
}

async function runObjectsList(flags: {
  limit?: string | undefined;
  since?: string | undefined;
  contentAs?: string | undefined;
  id?: string | undefined;
}): Promise<void> {
  await withClient(async (client) => {
    const query: ListOptions = {};
    const limit = parseOptionalLimit(flags.limit);
    if (limit !== undefined) query.limit = limit;
    if (flags.contentAs !== undefined && flags.contentAs !== "") {
      query.contentAs = flags.contentAs;
    }
    if (flags.id !== undefined && flags.id !== "") {
      const parts = flags.id.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 1) {
        query.id = parts[0];
      } else if (parts.length > 1) {
        query.id = parts;
      }
    }
    const result = await client.listObjects(query);
    let data = result.data;
    const warnings: string[] = [];
    if (flags.since) {
      const ms = parseSinceCutoffMs(flags.since);
      if (ms === null) throw new Error("Invalid --since (use e.g. 7d, 12h, 2w, 3mo)");
      const out = filterObjectsBySince(data, ms);
      data = out.filtered;
      if (out.dropped > 0) warnings.push(`Filtered ${out.dropped} objects older than --since`);
      if (Array.isArray(result.data) && Array.isArray(data) && data.length === 0 && out.dropped === result.data.length && limit !== undefined && result.data.length >= limit) {
        warnings.push("The --since filter removed a full fetched page; use a narrower query or wait for server-side since support.");
      }
    }
    printListEnvelope("objects.ls", data, result.rateLimit, warnings);
  });
}

const objectsLsCommand = defineCommand({
  meta: { name: "ls", description: "List objects" },
  args: {
    limit: { type: "string", description: "Max objects", valueHint: "n" },
    since: { type: "string", description: "Filter by created age (e.g. 7d)" },
    contentAs: { type: "string", description: "Ask API for embedded content", alias: ["content-as"] },
    id: { type: "string", description: "Restrict to object uid(s); comma-separated", valueHint: "uids" }
  },
  async run({ args }) {
    try {
      await runObjectsList({
        limit: args.limit,
        since: args.since,
        contentAs: args.contentAs as string | undefined,
        id: args.id as string | undefined
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

export const objectsGetCommand = defineCommand({
  meta: { name: "get", description: "Get object by id" },
  args: {
    id: { type: "positional", description: "Object uid", required: false }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.getObject(id);
          printEnvelope("objects.get", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsCreateCommand = defineCommand({
  meta: { name: "create", description: "Create object from url, body, or file" },
  args: {
    url: { type: "string", description: "Source URL" },
    body: { type: "string", description: "Markdown note body (exclusive with url/file)" },
    file: { type: "string", description: "Local file to upload" },
    title: { type: "string", description: "Title" },
    mimeType: { type: "string", description: "MIME override for file", alias: ["mime-type"] },
    yesCost: { type: "boolean", alias: ["yes-cost"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const url = args.url as string | undefined;
      const body = args.body as string | undefined;
      const file = args.file as string | undefined;
      const modes = [url, body, file].filter((x) => x !== undefined && x !== "");
      if (modes.length !== 1) throw new Error("Provide exactly one of --url, --body, or --file.");
      if (args.dryRun === true) {
        exitDryRun("objects.create", { url, hasBody: Boolean(body), file });
      }
      requireConfirm(args.yesCost, "Creating objects can incur credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client, config) => {
        if (file) {
          const uploadPath = await assertAllowedPath(file, config.allowedFileRoots);
          const stats = await stat(uploadPath);
          if (!stats.isFile()) throw new Error(`Not a file: ${file}`);
          const result = await client.createObjectFromFile(uploadPath, {
            title: args.title as string | undefined,
            mimeType: args.mimeType as string | undefined
          });
          printEnvelope("objects.create", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
          return;
        }
        if (url) {
          const result = await client.createObject({
            url,
            title: args.title as string | undefined
          });
          printEnvelope("objects.create", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
          return;
        }
        const result = await client.createObject({
          title: args.title as string | undefined,
          content: { type: "text/markdown", body }
        });
        printEnvelope("objects.create", decorateCreateResult(result.data as Record<string, unknown>, result.httpStatus), result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsUpdateCommand = defineCommand({
  meta: { name: "update", description: "Update object metadata" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    title: { type: "string", description: "New title" },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.update", { ids, title: args.title });
      requireConfirm(args.yes, "Updating objects requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.updateObject(id, { title: args.title as string | undefined });
          printEnvelope("objects.update", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsRmCommand = defineCommand({
  meta: { name: "rm", description: "Soft-delete objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    yesDelete: { type: "boolean", alias: ["yes-delete"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.rm", { ids });
      requireConfirmDelete(
        args.yes,
        args.yesDelete,
        "Deleting objects requires --yes and --yes-delete (or MYMIND_AUTO_CONFIRM=1)."
      );
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.deleteObject(id);
          printEnvelope("objects.rm", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsRestoreCommand = defineCommand({
  meta: { name: "restore", description: "Restore soft-deleted objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.restore", { ids });
      requireConfirm(args.yes, "Restoring objects requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.restoreObject(id);
          printEnvelope("objects.restore", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsPinCommand = defineCommand({
  meta: { name: "pin", description: "Pin objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    position: { type: "string", description: "Pin position", valueHint: "n" },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const pos =
        args.position !== undefined && args.position !== ""
          ? Number(args.position)
          : undefined;
      if (args.position !== undefined && args.position !== "" && !Number.isFinite(pos)) {
        throw new Error("Invalid --position");
      }
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.pin", { ids, position: pos });
      requireConfirm(args.yes, "Pinning requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.pinObject(id, pos);
          printEnvelope("objects.pin", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsUnpinCommand = defineCommand({
  meta: { name: "unpin", description: "Unpin objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.unpin", { ids });
      requireConfirm(args.yes, "Unpinning requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.unpinObject(id);
          printEnvelope("objects.unpin", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsDownloadCommand = defineCommand({
  meta: { name: "download", description: "Download object blob (inline text or write file)" },
  args: {
    id: { type: "positional", description: "Object uid", required: true },
    output: { type: "string", description: "Filename under MYMIND_OUTPUT_DIR", alias: ["o"] },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const id = args.id as string;
      const outputFilename = args.output as string | undefined;
      await withClient(async (client, config) => {
        if (outputFilename !== undefined && outputFilename !== "") {
          if (!config.outputDir) throw new Error("Set MYMIND_OUTPUT_DIR to save downloads.");
          if (args.dryRun === true) {
            const outputPath = await assertOutputPath(config.outputDir, outputFilename, { createDirectory: false });
            exitDryRun("objects.download", { id, outputPath });
          }
          requireConfirm(args.yes, "Writing a download requires --yes or MYMIND_AUTO_CONFIRM=1.");
          const outputPath = await assertOutputPath(config.outputDir, outputFilename, { createDirectory: true });
          const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
          await writeFile(outputPath, Buffer.from(await raw.response.arrayBuffer()));
          printEnvelope(
            "objects.download",
            { path: outputPath, contentType: raw.response.headers.get("Content-Type") },
            raw.rateLimit
          );
          return;
        }
        if (args.dryRun === true) exitDryRun("objects.download", { id, mode: "inline" });
        const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
        const contentType = raw.response.headers.get("Content-Type") ?? "application/octet-stream";
        if (!contentType.startsWith("text/") && !contentType.includes("json")) {
          printEnvelope(
            "objects.download",
            {
              contentType,
              message:
                "Binary response not returned inline. Pass -o <file> with MYMIND_OUTPUT_DIR set to save it."
            },
            raw.rateLimit
          );
          return;
        }
        printEnvelope(
          "objects.download",
          { content: await raw.response.text(), contentType },
          raw.rateLimit
        );
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsContentCommand = defineCommand({
  meta: { name: "content", description: "Fetch object content (markdown/prose/html)" },
  args: {
    id: { type: "positional", description: "Object uid", required: true },
    format: {
      type: "enum",
      description: "Content type",
      options: ["text/markdown", "application/prose+json", "text/html"],
      default: "text/markdown"
    }
  },
  async run({ args }) {
    try {
      const id = args.id as string;
      const format = args.format as "text/markdown" | "application/prose+json" | "text/html";
      await withClient(async (client) => {
        const result = await client.getObjectContent(id, format);
        printEnvelope("objects.content", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsReplaceCommand = defineCommand({
  meta: { name: "replace", description: "Replace note content" },
  args: {
    id: { type: "positional", description: "Object uid", required: true },
    contentType: {
      type: "enum",
      description: "Note format",
      options: ["text/markdown", "application/prose+json"],
      default: "text/markdown",
      alias: ["content-type"]
    },
    body: { type: "string", description: "Body text (else stdin)" },
    yes: { type: "boolean", alias: ["y"] },
    yesReplace: { type: "boolean", alias: ["yes-replace"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      let content: string | Record<string, unknown> = (args.body as string | undefined) ?? "";
      if (content === "") content = await readStdinAll();
      const ct = args.contentType as "text/markdown" | "application/prose+json";
      if (args.dryRun === true) exitDryRun("objects.replace", { id: args.id, contentType: ct });
      requireConfirmReplace(
        args.yes,
        args.yesReplace,
        "Replacing note content requires --yes and --yes-replace (or MYMIND_AUTO_CONFIRM=1)."
      );
      await withClient(async (client) => {
        const result = await client.replaceObjectContent(args.id as string, content, ct);
        printEnvelope("objects.replace", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsRelatedCommand = defineCommand({
  meta: { name: "related", description: "Find related objects (high cost)" },
  args: {
    id: { type: "positional", description: "Object uid", required: true },
    limit: { type: "string", valueHint: "n" },
    yesCost: { type: "boolean", alias: ["yes-cost"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      if (args.dryRun === true) exitDryRun("objects.related", { id: args.id });
      requireConfirm(
        args.yesCost,
        "Related search can cost credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1."
      );
      await withClient(async (client) => {
        const result = await client.findRelatedObjects(args.id as string, {
          limit: parseOptionalLimit(args.limit as string | undefined)
        });
        printEnvelope("objects.related", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsTagCommand = defineCommand({
  meta: { name: "tag", description: "Add tags to objects" },
  args: {
    id: { type: "positional", description: "Object uid", required: false },
    tags: { type: "string", description: "Comma-separated tag names", required: true },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const tags = parseCommaTags(args.tags as string);
      if (tags.length === 0) throw new Error("Provide at least one tag in --tags");
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.tag", { ids, tags });
      requireConfirm(args.yes, "Tagging requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const objectId of ids) {
          const result = await client.addObjectTags(objectId, tags);
          printEnvelope("objects.tag", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsLinkSpacesCommand = defineCommand({
  meta: { name: "link-spaces", description: "Add object to spaces (bulk via stdin ids)" },
  args: {
    spaces: { type: "string", description: "Comma-separated space ids", required: true },
    objectId: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const spaces = parseCommaSpaceIds(args.spaces as string);
      if (spaces.length === 0) throw new Error("Provide at least one space id in --spaces");
      const fromArg = args.objectId as string | undefined;
      const stdinIds = await readStdinLines();
      const objectIds = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (objectIds.length === 0) throw new Error("Provide <objectId> or pipe object ids on stdin");
      if (args.dryRun === true) exitDryRun("objects.link-spaces", { objectIds, spaces });
      requireConfirm(args.yes, "Linking spaces requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const objectId of objectIds) {
          const result = await client.addObjectSpaces(objectId, spaces);
          printEnvelope("objects.link-spaces", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsThumbnailCommand = defineCommand({
  meta: { name: "thumbnail", description: "Fetch object thumbnail (raw bytes or file)" },
  args: {
    id: { type: "positional", description: "Object uid", required: true },
    size: { type: "string", description: "Thumbnail size e.g. 200x200", valueHint: "WxH" },
    output: { type: "string", description: "Filename under MYMIND_OUTPUT_DIR", alias: ["o"] },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const id = args.id as string;
      const outputFilename = args.output as string | undefined;
      await withClient(async (client, config) => {
        const q =
          args.size !== undefined && args.size !== "" ? { size: args.size as string } : undefined;
        if (outputFilename !== undefined && outputFilename !== "") {
          if (!config.outputDir) throw new Error("Set MYMIND_OUTPUT_DIR to save thumbnails.");
          if (args.dryRun === true) {
            const outputPath = await assertOutputPath(config.outputDir, outputFilename, { createDirectory: false });
            exitDryRun("objects.thumbnail", { id, outputPath });
          }
          requireConfirm(args.yes, "Writing thumbnail requires --yes or MYMIND_AUTO_CONFIRM=1.");
          const raw = await client.getObjectThumbnailRaw(id, q);
          const outputPath = await assertOutputPath(config.outputDir, outputFilename, { createDirectory: true });
          await writeFile(outputPath, Buffer.from(await raw.response.arrayBuffer()));
          printEnvelope(
            "objects.thumbnail",
            { path: outputPath, contentType: raw.response.headers.get("Content-Type") },
            raw.rateLimit
          );
          return;
        }
        if (args.dryRun === true) exitDryRun("objects.thumbnail", { id, mode: "inline" });
        const raw = await client.getObjectThumbnailRaw(id, q);
        const buf = Buffer.from(await raw.response.arrayBuffer());
        printEnvelope(
          "objects.thumbnail",
          {
            contentType: raw.response.headers.get("Content-Type"),
            base64: buf.toString("base64"),
            bytes: buf.length
          },
          raw.rateLimit
        );
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const objectsSearchCommand = defineCommand({
  meta: { name: "search", description: "Search objects (same as top-level search)" },
  args: {
    q: { type: "positional", description: "Query", required: false },
    limit: { type: "string", valueHint: "n" },
    semantic: { type: "boolean" },
    rerank: { type: "boolean" },
    similarTo: { type: "string", alias: ["similar-to"] },
    yesCost: { type: "boolean", alias: ["yes-cost"] }
  },
  async run({ args }) {
    try {
      const q = args.q as string | undefined;
      const similarTo = args.similarTo as string | undefined;
      if (!q && !similarTo) throw new Error("Provide a query or --similar-to");
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
          limit: parseOptionalLimit(args.limit as string | undefined),
          semantic: args.semantic,
          rerank: args.rerank
        });
        printEnvelope("objects.search", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

export const objectsRootCommand = defineCommand({
  meta: { name: "objects", description: "Object operations" },
  subCommands: {
    ls: objectsLsCommand,
    get: objectsGetCommand,
    create: objectsCreateCommand,
    update: objectsUpdateCommand,
    rm: objectsRmCommand,
    restore: objectsRestoreCommand,
    pin: objectsPinCommand,
    unpin: objectsUnpinCommand,
    download: objectsDownloadCommand,
    content: objectsContentCommand,
    replace: objectsReplaceCommand,
    related: objectsRelatedCommand,
    tag: objectsTagCommand,
    "link-spaces": objectsLinkSpacesCommand,
    thumbnail: objectsThumbnailCommand,
    search: objectsSearchCommand
  }
});

export async function runObjectsListShortcut(flags: {
  limit?: string | undefined;
  since?: string | undefined;
}): Promise<void> {
  await runObjectsList(flags);
}
