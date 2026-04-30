import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MYMIND_PROMPT_ARG_SCHEMAS } from "../src/schemas/prompt-args.js";
import { MYMIND_RESOURCE_SCHEMA_REGISTRY } from "../src/schemas/resource-variables.js";
import { MYMIND_TOOL_INPUT_SCHEMAS } from "../src/tools/tool-input-schemas.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function flattenSingleDefinitionSchema(doc: Record<string, unknown>): Record<string, unknown> {
  const ref = doc.$ref;
  if (
    typeof ref === "string" &&
    ref.startsWith("#/definitions/") &&
    doc.definitions !== undefined &&
    typeof doc.definitions === "object"
  ) {
    const name = ref.slice("#/definitions/".length);
    const inner = (doc.definitions as Record<string, unknown>)[name];
    if (inner !== undefined && typeof inner === "object") {
      const out = { ...(inner as Record<string, unknown>) };
      if (typeof doc.$schema === "string") {
        out.$schema = doc.$schema;
      }
      return out;
    }
  }
  return doc;
}

function emitSchema(relPath: string, zodSchema: ZodType, title: string): void {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  let jsonSchema = zodToJsonSchema(zodSchema, {
    target: "jsonSchema7",
    strictUnions: true,
    $refStrategy: "none",
    name: title
  }) as Record<string, unknown>;
  jsonSchema = flattenSingleDefinitionSchema(jsonSchema);
  writeFileSync(abs, `${JSON.stringify(jsonSchema, null, 2)}\n`);
}

const registry: Record<string, string> = {};

for (const name of Object.keys(MYMIND_TOOL_INPUT_SCHEMAS) as (keyof typeof MYMIND_TOOL_INPUT_SCHEMAS)[]) {
  const schema = MYMIND_TOOL_INPUT_SCHEMAS[name];
  const rel = `docs/schemas/tools/${name}.input.schema.json`;
  emitSchema(rel, schema, name);
  registry[`tool:${name}`] = rel;
}

for (const name of Object.keys(MYMIND_PROMPT_ARG_SCHEMAS) as (keyof typeof MYMIND_PROMPT_ARG_SCHEMAS)[]) {
  const schema = MYMIND_PROMPT_ARG_SCHEMAS[name];
  const rel = `docs/schemas/prompts/${name}.args.schema.json`;
  emitSchema(rel, schema, `${name}PromptArgs`);
  registry[`prompt:${name}`] = rel;
}

for (const name of Object.keys(MYMIND_RESOURCE_SCHEMA_REGISTRY) as (keyof typeof MYMIND_RESOURCE_SCHEMA_REGISTRY)[]) {
  const schema = MYMIND_RESOURCE_SCHEMA_REGISTRY[name];
  const safe = String(name).replace(/[^a-z0-9_.-]+/gi, "_");
  const rel = `docs/schemas/resources/${safe}.schema.json`;
  emitSchema(rel, schema, `resource:${name}`);
  registry[`resource:${name}`] = rel;
}

const registryPath = join(root, "docs/schemas/registry.json");
writeFileSync(
  registryPath,
  `${JSON.stringify({ v: 1, strictObjectNote: "Tool/prompt/resource Zod schemas use .strict(); JSON Schema uses additionalProperties: false where applicable.", entries: registry }, null, 2)}\n`
);
