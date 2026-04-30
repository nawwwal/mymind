import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mymindAddObjectSpacesAction,
  mymindAddObjectTagsAction,
  mymindCreateObjectAction,
  mymindDeleteObjectAction,
  mymindDownloadObjectAction,
  mymindFindRelatedObjectsAction,
  mymindGetObjectAction,
  mymindGetObjectContentAction,
  mymindListObjectsAction,
  mymindPinObjectAction,
  mymindReplaceNoteContentAction,
  mymindRestoreObjectAction,
  mymindUnpinObjectAction,
  mymindUpdateObjectAction
} from "../actions/object-actions.js";
import {
  mymindAddObjectToSpaceAction,
  mymindCreateSpaceAction,
  mymindDeleteSpaceAction,
  mymindGetSpaceAction,
  mymindListSpacesAction,
  mymindRemoveObjectFromSpaceAction,
  mymindUpdateSpaceAction
} from "../actions/space-actions.js";
import {
  mymindConvertContentAction,
  mymindListTagsAction,
  mymindSearchObjectsAction
} from "../actions/tag-search-convert-actions.js";
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
    ({ id, limit }) => mymindListObjectsAction(client, { id, limit })
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
    (input) => mymindCreateObjectAction(client, config, input)
  );

  server.registerTool(
    "mymind_get_object",
    {
      title: "Get MyMind object",
      description: "Retrieves one object by ID.",
      inputSchema: { id: uid },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    ({ id }) => mymindGetObjectAction(client, id)
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
    (input) => mymindFindRelatedObjectsAction(client, input)
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
    (input) => mymindDownloadObjectAction(client, config, input)
  );

  server.registerTool(
    "mymind_get_object_content",
    {
      title: "Get text object content",
      description: "Gets content for text-based objects using Accept negotiation.",
      inputSchema: { id: uid, format: contentFormat },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    ({ id, format }) => mymindGetObjectContentAction(client, id, format)
  );

  server.registerTool(
    "mymind_update_object",
    {
      title: "Update MyMind object metadata",
      description: "Updates object metadata such as title.",
      inputSchema: { id: uid, title: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindUpdateObjectAction(client, input)
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
    (input) => mymindReplaceNoteContentAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_tags",
    {
      title: "Add tags to object",
      inputSchema: { objectId: uid, tags: z.array(tagInput).min(1), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectTagsAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_spaces",
    {
      title: "Add object to spaces",
      inputSchema: { objectId: uid, spaces: z.array(spaceRefInput).min(1), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectSpacesAction(client, input)
  );

  server.registerTool(
    "mymind_pin_object",
    {
      title: "Pin object",
      inputSchema: { id: uid, position: z.number().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindPinObjectAction(client, input)
  );

  server.registerTool(
    "mymind_unpin_object",
    {
      title: "Unpin object",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindUnpinObjectAction(client, input)
  );

  server.registerTool(
    "mymind_delete_object",
    {
      title: "Delete object",
      description: "Soft-deletes an object. Recoverable for 30 days.",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmDelete: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindDeleteObjectAction(client, input)
  );

  server.registerTool(
    "mymind_restore_object",
    {
      title: "Restore object",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindRestoreObjectAction(client, input)
  );

  registerSpaceTools(server, client);
  registerTagSearchConvertTools(server, client);
}

function registerSpaceTools(server: McpServer, client: MyMindClient): void {
  server.registerTool(
    "mymind_create_space",
    {
      title: "Create space",
      inputSchema: { name: z.string().min(1), color: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindCreateSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_get_space",
    {
      title: "Get space",
      inputSchema: { id: uid },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    ({ id }) => mymindGetSpaceAction(client, id)
  );

  server.registerTool(
    "mymind_list_spaces",
    {
      title: "List spaces",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    () => mymindListSpacesAction(client)
  );

  server.registerTool(
    "mymind_update_space",
    {
      title: "Update space",
      inputSchema: { id: uid, name: z.string().optional(), color: z.string().optional(), dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindUpdateSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_delete_space",
    {
      title: "Delete space",
      description: "Deletes the space only; contained objects remain in MyMind.",
      inputSchema: { id: uid, dryRun: dryRunInput, confirmDelete: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindDeleteSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_to_space",
    {
      title: "Add object to space",
      inputSchema: { spaceId: uid, objectId: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectToSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_remove_object_from_space",
    {
      title: "Remove object from space",
      inputSchema: { spaceId: uid, objectId: uid, dryRun: dryRunInput, confirmWrite: z.literal(true).optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindRemoveObjectFromSpaceAction(client, input)
  );
}

function registerTagSearchConvertTools(server: McpServer, client: MyMindClient): void {
  server.registerTool(
    "mymind_list_tags",
    {
      title: "List tags",
      inputSchema: { limit: z.number().int().positive().max(10000).optional() },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindListTagsAction(client, input)
  );

  server.registerTool(
    "mymind_search_objects",
    {
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
    },
    (input) => mymindSearchObjectsAction(client, input)
  );

  server.registerTool(
    "mymind_convert_content",
    {
      title: "Convert content",
      description: "Converts between text/plain, text/markdown, and application/prose+json.",
      inputSchema: {
        content: z.union([z.string(), z.record(z.unknown())]),
        from: convertFormat,
        to: convertFormat
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindConvertContentAction(client, input)
  );
}
