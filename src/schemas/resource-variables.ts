import { z } from "zod";

export const resourceIdSchema = z.string().min(1).refine((value) => !/[/?#]/.test(value), {
  message: "Resource IDs must not contain URI path, query, or fragment separators."
});

/** Variables parsed from `mymind://objects/{id}` */
export const resourceTemplateObjectVarsSchema = z.object({ id: resourceIdSchema }).strict();

/** Allowed content format suffix for object content resource */
export const resourceContentFormatSchema = z.enum(["markdown", "html", "prose"]);

/** Variables parsed from `mymind://objects/{id}/content/{format}` */
export const resourceTemplateObjectContentVarsSchema = z
  .object({
    id: resourceIdSchema,
    format: resourceContentFormatSchema
  })
  .strict();

/** Variables parsed from `mymind://spaces/{id}` */
export const resourceTemplateSpaceVarsSchema = z.object({ id: resourceIdSchema }).strict();

/** Static URIs (no variables) */
export const resourceStaticUrisSchema = z.enum(["mymind://spaces", "mymind://tags"]);

export const MYMIND_RESOURCE_SCHEMA_REGISTRY = {
  "object.vars": resourceTemplateObjectVarsSchema,
  "object_content.vars": resourceTemplateObjectContentVarsSchema,
  "space.vars": resourceTemplateSpaceVarsSchema,
  "static.collection_uris": resourceStaticUrisSchema
} as const;
