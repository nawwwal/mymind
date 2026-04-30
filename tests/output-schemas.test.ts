import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("output schemas", () => {
  it("compile and validate a basic envelope", () => {
    const schema = JSON.parse(readFileSync(join(process.cwd(), "docs/output-schemas/envelope.schema.json"), "utf8")) as object;
    const validate = new Ajv({ strict: true }).compile(schema);
    expect(validate({ v: 1, kind: "search", data: [], rateLimit: {}, warnings: [] })).toBe(true);
  });
});

