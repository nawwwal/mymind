import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import {
  mymindAddObjectSpacesInputSchema,
  mymindAddObjectTagsInputSchema,
  mymindAddObjectToSpaceInputSchema,
  mymindConvertContentInputSchema,
  mymindCreateObjectInputSchema,
  mymindCreateSpaceInputSchema,
  mymindDeleteObjectInputSchema,
  mymindDeleteSpaceInputSchema,
  mymindDownloadObjectInputSchema,
  mymindFindRelatedObjectsInputSchema,
  mymindGetObjectContentInputSchema,
  mymindGetObjectInputSchema,
  mymindGetSpaceInputSchema,
  mymindListObjectsInputSchema,
  mymindListSpacesInputSchema,
  mymindListTagsInputSchema,
  mymindPinObjectInputSchema,
  mymindRemoveObjectFromSpaceInputSchema,
  mymindReplaceNoteContentInputSchema,
  mymindRestoreObjectInputSchema,
  mymindSearchObjectsInputSchema,
  mymindUnpinObjectInputSchema,
  mymindUpdateObjectInputSchema,
  mymindUpdateSpaceInputSchema
} from "./tool-input-schemas.js";

interface ToolDependencies {
  client: MyMindClient;
  config: MymindMcpConfig;
}

export function registerMymindTools(server: McpServer, { client, config }: ToolDependencies): void {
  server.registerTool(
    "mymind_list_objects",
    {
      title: "List MyMind objects",
      description: "Returns objects from MyMind. Use id repeatedly to fetch specific objects.",
      inputSchema: mymindListObjectsInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindListObjectsAction(client, input)
  );

  server.registerTool(
    "mymind_create_object",
    {
      title: "Create MyMind object",
      description: "Creates a new object from exactly one of url, content, or local filePath.",
      inputSchema: mymindCreateObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindCreateObjectAction(client, config, input)
  );

  server.registerTool(
    "mymind_get_object",
    {
      title: "Get MyMind object",
      description: "Retrieves one object by ID.",
      inputSchema: mymindGetObjectInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindGetObjectAction(client, input.id)
  );

  server.registerTool(
    "mymind_find_related_objects",
    {
      title: "Find related MyMind objects",
      description: "Returns semantically related objects. Mastermind feature, 100 credits.",
      inputSchema: mymindFindRelatedObjectsInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindFindRelatedObjectsAction(client, input)
  );

  server.registerTool(
    "mymind_download_object",
    {
      title: "Download MyMind object",
      description: "Downloads object content inline, or writes into MYMIND_OUTPUT_DIR when outputFilename is provided.",
      inputSchema: mymindDownloadObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindDownloadObjectAction(client, config, input)
  );

  server.registerTool(
    "mymind_get_object_content",
    {
      title: "Get text object content",
      description: "Gets content for text-based objects using Accept negotiation.",
      inputSchema: mymindGetObjectContentInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindGetObjectContentAction(client, input.id, input.format)
  );

  server.registerTool(
    "mymind_update_object",
    {
      title: "Update MyMind object metadata",
      description: "Updates object metadata such as title.",
      inputSchema: mymindUpdateObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindUpdateObjectAction(client, input)
  );

  server.registerTool(
    "mymind_replace_note_content",
    {
      title: "Replace note content",
      description: "Full-replaces a Note content body. Markdown writes can drop Prose-only features.",
      inputSchema: mymindReplaceNoteContentInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindReplaceNoteContentAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_tags",
    {
      title: "Add tags to object",
      inputSchema: mymindAddObjectTagsInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectTagsAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_spaces",
    {
      title: "Add object to spaces",
      inputSchema: mymindAddObjectSpacesInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectSpacesAction(client, input)
  );

  server.registerTool(
    "mymind_pin_object",
    {
      title: "Pin object",
      inputSchema: mymindPinObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindPinObjectAction(client, input)
  );

  server.registerTool(
    "mymind_unpin_object",
    {
      title: "Unpin object",
      inputSchema: mymindUnpinObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindUnpinObjectAction(client, input)
  );

  server.registerTool(
    "mymind_delete_object",
    {
      title: "Delete object",
      description: "Soft-deletes an object. Recoverable for 30 days.",
      inputSchema: mymindDeleteObjectInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindDeleteObjectAction(client, input)
  );

  server.registerTool(
    "mymind_restore_object",
    {
      title: "Restore object",
      inputSchema: mymindRestoreObjectInputSchema,
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
      inputSchema: mymindCreateSpaceInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindCreateSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_get_space",
    {
      title: "Get space",
      inputSchema: mymindGetSpaceInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindGetSpaceAction(client, input.id)
  );

  server.registerTool(
    "mymind_list_spaces",
    {
      title: "List spaces",
      inputSchema: mymindListSpacesInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    () => mymindListSpacesAction(client)
  );

  server.registerTool(
    "mymind_update_space",
    {
      title: "Update space",
      inputSchema: mymindUpdateSpaceInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    (input) => mymindUpdateSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_delete_space",
    {
      title: "Delete space",
      description: "Deletes the space only; contained objects remain in MyMind.",
      inputSchema: mymindDeleteSpaceInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindDeleteSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_add_object_to_space",
    {
      title: "Add object to space",
      inputSchema: mymindAddObjectToSpaceInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    (input) => mymindAddObjectToSpaceAction(client, input)
  );

  server.registerTool(
    "mymind_remove_object_from_space",
    {
      title: "Remove object from space",
      inputSchema: mymindRemoveObjectFromSpaceInputSchema,
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
      inputSchema: mymindListTagsInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindListTagsAction(client, input)
  );

  server.registerTool(
    "mymind_search_objects",
    {
      title: "Search objects",
      description: "Searches objects with MyMind query syntax. Rerank is Mastermind-only and capped at 100.",
      inputSchema: mymindSearchObjectsInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindSearchObjectsAction(client, input)
  );

  server.registerTool(
    "mymind_convert_content",
    {
      title: "Convert content",
      description: "Converts between text/plain, text/markdown, and application/prose+json.",
      inputSchema: mymindConvertContentInputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    (input) => mymindConvertContentAction(client, input)
  );
}
