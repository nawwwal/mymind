import { Ajv } from "ajv";
import ajvFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("docs/schemas (strict JSON Schema)", () => {
  const ajv = new Ajv({ strict: true, allErrors: true });
  (ajvFormats as unknown as (a: Ajv) => void)(ajv);

  it("registry lists only existing files", () => {
    const registry = JSON.parse(readFileSync(join(root, "docs/schemas/registry.json"), "utf8")) as {
      entries: Record<string, string>;
    };
    for (const [, rel] of Object.entries(registry.entries)) {
      const abs = join(root, rel);
      expect(() => readFileSync(abs, "utf8"), rel).not.toThrow();
    }
  });

  it("every committed schema compiles under Ajv strict mode", () => {
    const registry = JSON.parse(readFileSync(join(root, "docs/schemas/registry.json"), "utf8")) as {
      entries: Record<string, string>;
    };
    for (const [key, rel] of Object.entries(registry.entries)) {
      const schema = JSON.parse(readFileSync(join(root, rel), "utf8")) as object;
      expect(() => ajv.compile(schema), key).not.toThrow();
    }
  });

  it("tool schemas use additionalProperties: false at the root object", () => {
    const registry = JSON.parse(readFileSync(join(root, "docs/schemas/registry.json"), "utf8")) as {
      entries: Record<string, string>;
    };
    for (const [key, rel] of Object.entries(registry.entries)) {
      if (!key.startsWith("tool:")) continue;
      const schema = JSON.parse(readFileSync(join(root, rel), "utf8")) as {
        type?: string;
        additionalProperties?: boolean;
      };
      expect(schema.type, key).toBe("object");
      expect(schema.additionalProperties, key).toBe(false);
    }
  });

  it("rejects extra properties for mymind_list_objects", () => {
    const schema = JSON.parse(
      readFileSync(join(root, "docs/schemas/tools/mymind_list_objects.input.schema.json"), "utf8")
    ) as object;
    const validate = ajv.compile(schema);
    expect(validate({ bogus: 1 })).toBe(false);
    expect(validate({})).toBe(true);
    expect(validate({ limit: 10 })).toBe(true);
  });
});
