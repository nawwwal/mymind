import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CLI_OUTPUT_SCHEMAS } from "../src/schemas/output/envelope.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function flatten(doc: Record<string, unknown>): Record<string, unknown> {
  const ref = doc.$ref;
  if (typeof ref === "string" && ref.startsWith("#/definitions/") && doc.definitions) {
    const name = ref.slice("#/definitions/".length);
    const inner = (doc.definitions as Record<string, unknown>)[name];
    if (inner && typeof inner === "object") {
      return { ...(inner as Record<string, unknown>), $schema: doc.$schema };
    }
  }
  return doc;
}

function emit(name: string, schema: ZodType): string {
  const rel = `docs/output-schemas/${name}.schema.json`;
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  const jsonSchema = flatten(
    zodToJsonSchema(schema, {
      target: "jsonSchema7",
      strictUnions: true,
      $refStrategy: "none",
      name
    }) as Record<string, unknown>
  );
  writeFileSync(abs, `${JSON.stringify(jsonSchema, null, 2)}\n`);
  return rel;
}

const entries: Record<string, string> = {};
for (const [name, schema] of Object.entries(CLI_OUTPUT_SCHEMAS)) {
  entries[name] = emit(name, schema);
}
writeFileSync(
  join(root, "docs/output-schemas/registry.json"),
  `${JSON.stringify({ v: 1, entries }, null, 2)}\n`
);

