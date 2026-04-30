import { z } from "zod";

const JsonLiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export type JsonLiteral = z.infer<typeof JsonLiteralSchema>;
export type JsonValue =
  | JsonLiteral
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonLiteralSchema, z.array(JsonValueSchema), z.record(JsonValueSchema)])
);

export const UnknownObjectSchema = z.record(z.string(), z.unknown());

export const DateLikeSchema = z.union([z.string(), z.number(), z.date()]).optional();

export const BlobReferenceSchema = z
  .object({
    id: z.string().optional(),
    path: z.string().optional(),
    type: z.string().optional(),
    url: z.string().url().optional(),
    name: z.string().optional(),
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    contentType: z.string().optional(),
    size: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    hash: z.string().optional()
  })
  .catchall(z.unknown());

export const ProseSchema = z
  .object({
    text: z.string().optional(),
    markdown: z.string().optional(),
    html: z.string().optional(),
    plain: z.string().optional(),
    blocks: z.array(z.unknown()).optional()
  })
  .catchall(z.unknown());

export const ContentSchema = z
  .object({
    type: z.string().optional(),
    body: z.union([z.string(), ProseSchema]).optional(),
    text: z.string().optional(),
    markdown: z.string().optional(),
    html: z.string().optional(),
    url: z.string().optional(),
    sourceUrl: z.string().optional(),
    prose: ProseSchema.optional(),
    blob: BlobReferenceSchema.optional(),
    blobs: z.array(BlobReferenceSchema).optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .catchall(z.unknown());

export const BaseResourceSchema = z
  .object({
    id: z.string()
  })
  .catchall(z.unknown());

export const ObjectSchema = BaseResourceSchema.extend({
  title: z.string().optional(),
  content: ContentSchema.optional(),
  entity: z.unknown().optional(),
  source: z.object({ url: z.string().optional() }).catchall(z.unknown()).optional(),
  spaces: z.array(z.object({ id: z.string() }).catchall(z.unknown())).optional(),
  tags: z.array(z.object({ name: z.string(), flags: z.number().optional() }).catchall(z.unknown())).optional(),
  notes: z.array(z.object({ id: z.string(), content: ContentSchema }).catchall(z.unknown())).optional(),
  bumped: DateLikeSchema,
  created: DateLikeSchema,
  modified: DateLikeSchema,
  deleted: DateLikeSchema
}).catchall(z.unknown());

export const SpaceSchema = BaseResourceSchema.extend({
  name: z.string().optional(),
  color: z.string().optional(),
  created: DateLikeSchema,
  objects: z.array(z.object({ id: z.string() }).catchall(z.unknown())).optional()
}).catchall(z.unknown());

export const TagSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  count: z.number().optional(),
  flags: z.number().optional(),
  modified: DateLikeSchema
}).catchall(z.unknown());

export const EntitySchema = BaseResourceSchema.extend({
  type: z.string().optional()
}).catchall(z.unknown());

export const SearchMatchSchema = z.object({
  id: z.string(),
  score: z.number()
}).catchall(z.unknown());

export const SearchResultSchema = z
  .union([
    z.array(SearchMatchSchema),
    z
      .object({
        matches: z.array(SearchMatchSchema)
      })
      .catchall(z.unknown())
  ])
  .transform((result) => (Array.isArray(result) ? result : result.matches));

export const ConvertResultSchema = z.union([z.string(), ProseSchema]);

export const EmptyObjectSchema = z
  .object({
  })
  .catchall(z.unknown());

export const AnyResultSchema = z
  .union([
    z.string(),
    z.array(z.unknown()),
    z.record(z.string(), z.unknown()),
    z.undefined()
  ]);

export const ObjectTagSchema = z
  .object({
    name: z.string(),
    flags: z.number().optional()
  })
  .catchall(z.unknown());

export const ObjectSpaceSchema = z
  .object({
    id: z.string()
  })
  .catchall(z.unknown());

export type BlobReference = z.infer<typeof BlobReferenceSchema>;
export type Prose = z.infer<typeof ProseSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type MymindObject = z.infer<typeof ObjectSchema>;
export type MymindSpace = z.infer<typeof SpaceSchema>;
export type MymindTag = z.infer<typeof TagSchema>;
export type MymindEntity = z.infer<typeof EntitySchema>;
export type MymindSearchResult = z.infer<typeof SearchResultSchema>;
export type MymindConvertResult = z.infer<typeof ConvertResultSchema>;
export type MymindSearchMatch = z.infer<typeof SearchMatchSchema>;
