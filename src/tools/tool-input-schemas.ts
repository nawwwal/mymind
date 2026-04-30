import { z } from "zod";

/** Shared primitives */
export const uidSchema = z.string().min(1);
export type Uid = z.infer<typeof uidSchema>;

const dryRunSchema = z.boolean().optional();

/** Body shape for Prose-style embedded content in create object */
export const proseBodySchema = z.object({ type: z.string(), body: z.unknown() }).strict();

export const tagInputSchema = z.object({ name: z.string().min(1), flags: z.number().optional() }).strict();
export const spaceRefInputSchema = z.object({ id: uidSchema }).strict();

export const contentFormatSchema = z.enum(["text/markdown", "application/prose+json", "text/html"]);
export const replaceContentFormatSchema = z.enum(["text/markdown", "application/prose+json"]);
export const convertFormatSchema = z.enum(["text/plain", "text/markdown", "application/prose+json"]);

export const mymindListObjectsInputSchema = z
  .object({
    id: z.array(uidSchema).optional(),
    limit: z.number().int().positive().max(10000).optional()
  })
  .strict();

export const mymindCreateObjectInputSchema = z
  .object({
    title: z.string().optional(),
    url: z.string().url().optional(),
    content: z.union([z.string(), proseBodySchema]).optional(),
    tags: z.array(tagInputSchema).optional(),
    spaces: z.array(spaceRefInputSchema).optional(),
    filePath: z.string().optional(),
    mimeType: z.string().optional(),
    dryRun: dryRunSchema,
    confirmHighCost: z.literal(true).optional()
  })
  .strict();

export const mymindGetObjectInputSchema = z.object({ id: uidSchema }).strict();

export const mymindFindRelatedObjectsInputSchema = z
  .object({
    id: uidSchema,
    limit: z.number().int().positive().max(1000).optional(),
    confirmHighCost: z.literal(true)
  })
  .strict();

export const mymindDownloadObjectInputSchema = z
  .object({
    id: uidSchema,
    outputFilename: z.string().min(1).optional(),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindGetObjectContentInputSchema = z
  .object({
    id: uidSchema,
    format: contentFormatSchema
  })
  .strict();

export const mymindUpdateObjectInputSchema = z
  .object({
    id: uidSchema,
    title: z.string().optional(),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindReplaceNoteContentInputSchema = z
  .object({
    id: uidSchema,
    content: z.union([z.string(), z.record(z.string(), z.unknown())]),
    contentType: replaceContentFormatSchema,
    dryRun: dryRunSchema,
    confirmReplace: z.literal(true).optional()
  })
  .strict();

export const mymindAddObjectTagsInputSchema = z
  .object({
    objectId: uidSchema,
    tags: z.array(tagInputSchema).min(1),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindAddObjectSpacesInputSchema = z
  .object({
    objectId: uidSchema,
    spaces: z.array(spaceRefInputSchema).min(1),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindPinObjectInputSchema = z
  .object({
    id: uidSchema,
    position: z.number().optional(),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindUnpinObjectInputSchema = z
  .object({
    id: uidSchema,
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindDeleteObjectInputSchema = z
  .object({
    id: uidSchema,
    dryRun: dryRunSchema,
    confirmDelete: z.literal(true).optional()
  })
  .strict();

export const mymindRestoreObjectInputSchema = z
  .object({
    id: uidSchema,
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindCreateSpaceInputSchema = z
  .object({
    name: z.string().min(1),
    color: z.string().optional(),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindGetSpaceInputSchema = z.object({ id: uidSchema }).strict();

export const mymindListSpacesInputSchema = z.object({}).strict();

export const mymindUpdateSpaceInputSchema = z
  .object({
    id: uidSchema,
    name: z.string().optional(),
    color: z.string().optional(),
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindDeleteSpaceInputSchema = z
  .object({
    id: uidSchema,
    dryRun: dryRunSchema,
    confirmDelete: z.literal(true).optional()
  })
  .strict();

export const mymindAddObjectToSpaceInputSchema = z
  .object({
    spaceId: uidSchema,
    objectId: uidSchema,
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindRemoveObjectFromSpaceInputSchema = z
  .object({
    spaceId: uidSchema,
    objectId: uidSchema,
    dryRun: dryRunSchema,
    confirmWrite: z.literal(true).optional()
  })
  .strict();

export const mymindListTagsInputSchema = z
  .object({
    limit: z.number().int().positive().max(10000).optional()
  })
  .strict();

export const mymindSearchObjectsInputSchema = z
  .object({
    q: z.string().min(1),
    limit: z.number().int().positive().max(1000).optional(),
    semantic: z.boolean().optional(),
    semanticBoost: z.number().optional(),
    rerank: z.boolean().optional(),
    dryRun: dryRunSchema,
    confirmHighCost: z.literal(true).optional()
  })
  .strict();

export const mymindConvertContentInputSchema = z
  .object({
    content: z.union([z.string(), z.record(z.string(), z.unknown())]),
    from: convertFormatSchema,
    to: convertFormatSchema
  })
  .strict();

/** Single source of truth for MCP tool names and input shapes (strict objects). */
export const MYMIND_TOOL_INPUT_SCHEMAS = {
  mymind_list_objects: mymindListObjectsInputSchema,
  mymind_create_object: mymindCreateObjectInputSchema,
  mymind_get_object: mymindGetObjectInputSchema,
  mymind_find_related_objects: mymindFindRelatedObjectsInputSchema,
  mymind_download_object: mymindDownloadObjectInputSchema,
  mymind_get_object_content: mymindGetObjectContentInputSchema,
  mymind_update_object: mymindUpdateObjectInputSchema,
  mymind_replace_note_content: mymindReplaceNoteContentInputSchema,
  mymind_add_object_tags: mymindAddObjectTagsInputSchema,
  mymind_add_object_spaces: mymindAddObjectSpacesInputSchema,
  mymind_pin_object: mymindPinObjectInputSchema,
  mymind_unpin_object: mymindUnpinObjectInputSchema,
  mymind_delete_object: mymindDeleteObjectInputSchema,
  mymind_restore_object: mymindRestoreObjectInputSchema,
  mymind_create_space: mymindCreateSpaceInputSchema,
  mymind_get_space: mymindGetSpaceInputSchema,
  mymind_list_spaces: mymindListSpacesInputSchema,
  mymind_update_space: mymindUpdateSpaceInputSchema,
  mymind_delete_space: mymindDeleteSpaceInputSchema,
  mymind_add_object_to_space: mymindAddObjectToSpaceInputSchema,
  mymind_remove_object_from_space: mymindRemoveObjectFromSpaceInputSchema,
  mymind_list_tags: mymindListTagsInputSchema,
  mymind_search_objects: mymindSearchObjectsInputSchema,
  mymind_convert_content: mymindConvertContentInputSchema
} as const;

export type MymindToolName = keyof typeof MYMIND_TOOL_INPUT_SCHEMAS;

/** Registration / manifest order (stable). */
export const MYMIND_TOOL_NAMES_ORDERED: MymindToolName[] = [
  "mymind_list_objects",
  "mymind_create_object",
  "mymind_get_object",
  "mymind_find_related_objects",
  "mymind_download_object",
  "mymind_get_object_content",
  "mymind_update_object",
  "mymind_replace_note_content",
  "mymind_add_object_tags",
  "mymind_add_object_spaces",
  "mymind_pin_object",
  "mymind_unpin_object",
  "mymind_delete_object",
  "mymind_restore_object",
  "mymind_create_space",
  "mymind_get_space",
  "mymind_list_spaces",
  "mymind_update_space",
  "mymind_delete_space",
  "mymind_add_object_to_space",
  "mymind_remove_object_from_space",
  "mymind_list_tags",
  "mymind_search_objects",
  "mymind_convert_content"
];
