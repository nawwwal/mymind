import { stat, writeFile } from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dryRunResult, jsonContent, jsonResult, summarizeContent } from "../actions/mcp-result.js";
import { assertAllowedPath, assertOutputPath } from "../actions/paths.js";
import type { MymindMcpConfig } from "../config.js";
import type { MyMindClient } from "../mymind/index.js";

interface ToolDependencies {
  client: MyMindClient;
  config: MymindMcpConfig;
}

const uid = z.string().min(1);
const tagInput = z.object({ name: z.string().min(1), flags: z.number().optional() });
const spaceRefInput = z.object({ id: uid });
const contentFormat = z.enum(["text/markdown", "application/prose+json", "text/html"]);
const replaceContentFormat = z.enum(["text/markdown", "application/prose+json"]);
const convertFormat = z.enum(["text/plain", "text/markdown", "application/prose+json"]);
const dryRunInput = z.boolean().optional();

export function registerMymindTools(server: McpServer, { client, config }: ToolDependencies): void {
  server.registerTool(
    "mymind_list_objects",
    {
      title: "List MyMind objects",
      description: "Returns objects from MyMind. Use id repeatedly to fetch specific objects.",
      inputSchema: {
        id: z.array(uid).optional(),
        limit: z.number().int().positive().max(10000).optional()
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ id, limit }) => jsonResult(await client.listObjects({ id, limit }))
  );

  server.registerTool(
    "mymind_create_object",
    {
      title: "Create MyMind object",
      description: "Creates a new object from exactly one of url, content, or local filePath.",
      inputSchema: {
        title: z.string().optional(),
        url: z.string().url().optional(),
        content: z.union([z.string(), z.object({ type: z.string(), body: z.unknown() }).passthrough()]).optional(),
        tags: z.array(tagInput).optional(),
        spaces: z.array(spaceRefInput).optional(),
        filePath: z.string().optional(),
        mimeType: z.string().optional(),
        dryRun: dryRunInput,
        confirmHighCost: z.literal(true).optional()
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ filePath, mimeType, confirmHighCost, dryRun, ...input }) => {
      const provided = [input.url, input.content, filePath].filter((value) => value !== undefined).length;
      if (provided !== 1) {
        throw new Error("Provide exactly one of url, content, or filePath.");
      }
      if (filePath !== undefined) {
        const uploadPath = await assertAllowedPath(filePath, config.allowedFileRoots);
        const stats = await stat(uploadPath);
        if (!stats.isFile()) {
          throw new Error(`Upload path is not a file: ${filePath}`);
        }
        if (stats.size > 64 * 1024 * 1024) {
          throw new Error("MyMind uploads are capped at 64 MB.");
        }
        if (dryRun === true) {
          return dryRunResult("mymind_create_object", {
            ...input,
            filePath: uploadPath,
            mimeType,
            fileSize: stats.size
          });
        }
        requireConfirmed(confirmHighCost, "Creating objects can cost up to 250 credits.");
        return jsonResult(await client.createObjectFromFile(uploadPath, { ...input, mimeType }));
      }
      if (dryRun === true) {
        return dryRunResult("mymind_create_object", input);
      }
      requireConfirmed(confirmHighCost, "Creating objects can cost up to 250 credits.");
      return jsonResult(await client.createObject(input));
    }
  );

  server.registerTool(
    "mymind_get_object",
    {
      title: "Get MyMind object",
      description: "Retrieves one object by ID.",
      inputSchema: { id: uid },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ id }) => jsonResult(await client.getObject(id))
  );

  server.registerTool(
    "mymind_find_related_objects",
    {
      title: "Find related MyMind objects",
      description: "Returns semantically related objects. Mastermind feature, 100 credits.",
      inputSchema: {
        id: uid,
        limit: z.number().int().positive().max(1000).optional(),
        confirmHighCost: z.literal(true)
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ id, limit, confirmHighCost }) => {
      requireConfirmed(confirmHighCost, "Related-object search costs 100 credits and may require Mastermind.");
      return jsonResult(await client.findRelatedObjects(id, { limit }));
    }
  );

  server.registerTool(
    "mymind_download_object",
    {
      title: "Download MyMind object",
      description: "Downloads object content inline, or writes into MYMIND_OUTPUT_DIR when outputFilename is provided.",
      inputSchema: {
        id: uid,
        outputFilename: z.string().min(1).optional(),
        dryRun: dryRunInput,
        confirmWrite: z.literal(true).optional()
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ id, outputFilename, dryRun, confirmWrite }) => {
      if (outputFilename !== undefined) {
        if (!config.outputDir) {
          throw new Error("Set MYMIND_OUTPUT_DIR to save downloads.");
        }
        const outputPath = await assertOutputPath(config.outputDir, outputFilename, { createDirectory: dryRun !== true });
        if (dryRun === true) {
          return dryRunResult("mymind_download_object", {
            id,
            outputFilename,
            outputPath,
            outputDir: config.outputDir
          });
        }
        requireConfirmed(confirmWrite, "Writing a download requires confirmWrite=true.");
        const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
        await writeFile(outputPath, Buffer.from(await raw.response.arrayBuffer()));
        return jsonContent({ path: outputPath, contentType: raw.response.headers.get("Content-Type"), rateLimit: raw.rateLimit });
      }
      if (dryRun === true) {
        return dryRunResult("mymind_download_object", { id, mode: "inline" });
      }
      const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
      const contentType = raw.response.headers.get("Content-Type") ?? "application/octet-stream";
      if (!contentType.startsWith("text/") && !contentType.includes("json")) {
        return jsonContent({
          contentType,
          message: "Binary response not returned inline. Provide outputFilename and set MYMIND_OUTPUT_DIR to save it.",
          rateLimit: raw.rateLimit
        });
      }
      return jsonContent({ content: await raw.response.text(), contentType, rateLimit: raw.rateLimit });
    }
  );

  server.registerTool(
    "mymind_get_object_content",
    {
      title: "Get text object content",
      description: "Gets content for text-based objects using Accept negotiation.",
      inputSchema: { id: uid, format: contentFormat },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ id, format }) => jsonResult(await client.getObjectContent(id, format))
  );

  server.registerTool(
    "mymind_update_object",
    {
      title: "Update MyMind object metadata",
      description: "Updates object metadata such as title.",
      inputSchema: { id: uid, title: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ id, confirmWrite, dryRun, ...input }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_update_object", { id, ...input });
      }
      requireConfirmed(confirmWrite, "Updating object metadata requires confirmation.");
      return jsonResult(await client.updateObject(id, input));
    }
  );

  server.registerTool(
    "mymind_replace_note_content",
    {
      title: "Replace note content",
      description: "Full-replaces a Note content body. Markdown writes can drop Prose-only features.",
      inputSchema: {
        id: uid,
        content: z.union([z.string(), z.record(z.unknown())]),
        contentType: replaceContentFormat,
        dryRun: dryRunInput,
        confirmReplace: z.literal(true).optional()
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, content, contentType, confirmReplace, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_replace_note_content", { id, contentType, content: summarizeContent(content) });
      }
      requireConfirmed(confirmReplace, "Replacing note content is destructive.");
      return jsonResult(await client.replaceObjectContent(id, content, contentType));
    }
  );

  server.registerTool(
    "mymind_add_object_tags",
    {
      title: "Add tags to object",
      inputSchema: { objectId: uid, tags: z.array(tagInput).min(1), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ objectId, tags, confirmWrite, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_add_object_tags", { objectId, tags });
      }
      requireConfirmed(confirmWrite, "Adding tags requires confirmation.");
      return jsonResult(await client.addObjectTags(objectId, tags));
    }
  );

  server.registerTool(
    "mymind_add_object_spaces",
    {
      title: "Add object to spaces",
      inputSchema: { objectId: uid, spaces: z.array(spaceRefInput).min(1), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ objectId, spaces, confirmWrite, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_add_object_spaces", { objectId, spaces });
      }
      requireConfirmed(confirmWrite, "Adding spaces requires confirmation.");
      return jsonResult(await client.addObjectSpaces(objectId, spaces));
    }
  );

  server.registerTool(
    "mymind_pin_object",
    {
      title: "Pin object",
      inputSchema: { id: uid, position: z.number().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, position, confirmWrite, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_pin_object", { id, position });
      }
      requireConfirmed(confirmWrite, "Pinning requires confirmation.");
      return jsonResult(await client.pinObject(id, position));
    }
  );

  server.registerTool(
    "mymind_unpin_object",
    {
      title: "Unpin object",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, confirmWrite, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_unpin_object", { id });
      }
      requireConfirmed(confirmWrite, "Unpinning requires confirmation.");
      return jsonResult(await client.unpinObject(id));
    }
  );

  server.registerTool(
    "mymind_delete_object",
    {
      title: "Delete object",
      description: "Soft-deletes an object. Recoverable for 30 days.",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmDelete: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, confirmDelete, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_delete_object", { id });
      }
      requireConfirmed(confirmDelete, "Deleting an object requires confirmDelete=true.");
      return jsonResult(await client.deleteObject(id));
    }
  );

  server.registerTool(
    "mymind_restore_object",
    {
      title: "Restore object",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ id, confirmWrite, dryRun }) => {
      if (dryRun === true) {
        return dryRunResult("mymind_restore_object", { id });
      }
      requireConfirmed(confirmWrite, "Restoring requires confirmation.");
      return jsonResult(await client.restoreObject(id));
    }
  );

  registerSpaceTools(server, client);
  registerTagSearchConvertTools(server, client);
}

function registerSpaceTools(server: McpServer, client: MyMindClient): void {
  server.registerTool("mymind_create_space", {
    title: "Create space",
    inputSchema: { name: z.string().min(1), color: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
  }, async ({ confirmWrite, dryRun, ...input }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_create_space", input);
    }
    requireConfirmed(confirmWrite, "Creating a space costs 100 credits.");
    return jsonResult(await client.createSpace(input));
  });

  server.registerTool("mymind_get_space", {
    title: "Get space",
    inputSchema: { id: uid },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ id }) => jsonResult(await client.getSpace(id)));

  server.registerTool("mymind_list_spaces", {
    title: "List spaces",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async () => jsonResult(await client.listSpaces()));

  server.registerTool("mymind_update_space", {
    title: "Update space",
    inputSchema: { id: uid, name: z.string().optional(), color: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
  }, async ({ id, confirmWrite, dryRun, ...input }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_update_space", { id, ...input });
    }
    requireConfirmed(confirmWrite, "Updating a space requires confirmation.");
    return jsonResult(await client.updateSpace(id, input));
  });

  server.registerTool("mymind_delete_space", {
    title: "Delete space",
    description: "Deletes the space only; contained objects remain in MyMind.",
    inputSchema: { id: uid, dryRun: dryRunInput, confirmDelete: z.literal(true).optional() },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
  }, async ({ id, confirmDelete, dryRun }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_delete_space", { id });
    }
    requireConfirmed(confirmDelete, "Deleting a space requires confirmDelete=true.");
    return jsonResult(await client.deleteSpace(id));
  });

  server.registerTool("mymind_add_object_to_space", {
    title: "Add object to space",
    inputSchema: { spaceId: uid, objectId: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  }, async ({ spaceId, objectId, confirmWrite, dryRun }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_add_object_to_space", { spaceId, objectId });
    }
    requireConfirmed(confirmWrite, "Adding object to space requires confirmation.");
    return jsonResult(await client.addObjectToSpace(spaceId, objectId));
  });

  server.registerTool("mymind_remove_object_from_space", {
    title: "Remove object from space",
    inputSchema: { spaceId: uid, objectId: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  }, async ({ spaceId, objectId, confirmWrite, dryRun }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_remove_object_from_space", { spaceId, objectId });
    }
    requireConfirmed(confirmWrite, "Removing object from space requires confirmation.");
    return jsonResult(await client.removeObjectFromSpace(spaceId, objectId));
  });
}

function registerTagSearchConvertTools(server: McpServer, client: MyMindClient): void {
  server.registerTool("mymind_list_tags", {
    title: "List tags",
    inputSchema: { limit: z.number().int().positive().max(10000).optional() },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ limit }) => jsonResult(await client.listTags({ limit })));

  server.registerTool("mymind_search_objects", {
    title: "Search objects",
    description: "Searches objects with MyMind query syntax. Rerank is Mastermind-only and capped at 100.",
    inputSchema: {
      q: z.string().min(1),
      limit: z.number().int().positive().max(1000).optional(),
      semantic: z.boolean().optional(),
      semanticBoost: z.number().optional(),
      rerank: z.boolean().optional(),
      dryRun: dryRunInput,
      confirmHighCost: z.literal(true).optional()
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ confirmHighCost, dryRun, ...input }) => {
    if (dryRun === true) {
      return dryRunResult("mymind_search_objects", input);
    }
    if ((input.semantic || input.rerank) && confirmHighCost !== true) {
      throw new Error("Semantic/rerank search can cost up to 250 credits. Set confirmHighCost=true.");
    }
    return jsonResult(await client.search(input));
  });

  server.registerTool("mymind_convert_content", {
    title: "Convert content",
    description: "Converts between text/plain, text/markdown, and application/prose+json.",
    inputSchema: {
      content: z.union([z.string(), z.record(z.unknown())]),
      from: convertFormat,
      to: convertFormat
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  },     async ({ content, from, to }) => {
    if (from === to) {
      throw new Error("Convert requires different from and to formats.");
    }
    return jsonResult(await client.convert({ content, from, to }));
  });
}

function requireConfirmed(value: unknown, message: string): void {
  if (value !== true) {
    throw new Error(message);
  }
}
