import { describe, expect, it } from "vitest";
import { parseSearchIntent } from "../../src/cli-app/search-intent.js";

describe("parseSearchIntent", () => {
  it.each([
    [{ tags: ["reading"] }, "tag:reading"],
    [{ q: "#reading" }, "tag:reading"],
    [{ q: "tags reading" }, "tag:reading"],
    [{ q: "tag reading" }, "tag:reading"],
    [{ q: "from github.com" }, "domain:github.com"],
    [{ q: "notes about design" }, "design && type:note"],
    [{ q: "unread reading" }, "reading && completed:false"],
    [{ q: "design systems", type: "note", tags: ["work"] }, "design systems && type:note && tag:work"]
  ])("maps friendly search input %# to MyMind DSL", (input, query) => {
    expect(parseSearchIntent(input).query).toBe(query);
  });

  it("combines comma-separated tags with explicit filters", () => {
    expect(parseSearchIntent({ tags: ["reading,work"], domain: "github.com", completed: "false" }).query).toBe(
      "domain:github.com && completed:false && tag:reading && tag:work"
    );
  });

  it("rejects invalid completed filters with a useful example", () => {
    expect(() => parseSearchIntent({ completed: "maybe" })).toThrow(/Example: mymind search --completed false/);
  });
});
