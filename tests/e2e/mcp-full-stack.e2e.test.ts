import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMymindMcpServer } from "../../src/server.js";
import type { MymindToolName } from "../../src/tools/tool-input-schemas.js";
import { MYMIND_TOOL_NAMES_ORDERED } from "../../src/tools/tool-input-schemas.js";
import { createE2eMockMyMindClient } from "./mock-mymind-client.js";

const testConfig = {
  kid: "kid",
  secret: Buffer.from("secret").toString("base64"),
  apiBaseUrl: "https://api.mymind.com",
  userAgent: "e2e-test",
  allowedFileRoots: [],
  jwtValiditySeconds: 86_400
};

function firstResourceText(contents: unknown): string | undefined {
  if (!Array.isArray(contents)) return undefined;
  const c = contents[0];
  if (!c || typeof c !== "object") return undefined;
  const t = (c as Record<string, unknown>).text;
  return typeof t === "string" ? t : undefined;
}

const e2eToolArguments = {
  mymind_list_objects: {},
  mymind_create_object: { url: "https://example.com/", confirmHighCost: true },
  mymind_get_object: { id: "obj_1" },
  mymind_find_related_objects: { id: "obj_1", confirmHighCost: true },
  mymind_download_object: { id: "obj_1" },
  mymind_get_object_content: { id: "obj_1", format: "text/markdown" },
  mymind_update_object: { id: "obj_1", title: "t", confirmWrite: true },
  mymind_replace_note_content: {
    id: "obj_1",
    content: "x",
    contentType: "text/markdown",
    confirmReplace: true
  },
  mymind_add_object_tags: { objectId: "obj_1", tags: [{ name: "t" }], confirmWrite: true },
  mymind_add_object_spaces: { objectId: "obj_1", spaces: [{ id: "s1" }], confirmWrite: true },
  mymind_pin_object: { id: "obj_1", confirmWrite: true },
  mymind_unpin_object: { id: "obj_1", confirmWrite: true },
  mymind_delete_object: { id: "obj_1", confirmDelete: true },
  mymind_restore_object: { id: "obj_1", confirmWrite: true },
  mymind_create_space: { name: "Space", confirmWrite: true },
  mymind_get_space: { id: "s1" },
  mymind_list_spaces: {},
  mymind_update_space: { id: "s1", name: "n", confirmWrite: true },
  mymind_delete_space: { id: "s1", confirmDelete: true },
  mymind_add_object_to_space: { spaceId: "s1", objectId: "o1", confirmWrite: true },
  mymind_remove_object_from_space: { spaceId: "s1", objectId: "o1", confirmWrite: true },
  mymind_list_tags: {},
  mymind_search_objects: { q: "hello" },
  mymind_convert_content: { content: "x", from: "text/plain", to: "text/markdown" }
} satisfies Record<MymindToolName, Record<string, unknown>>;

describe("E2E MCP (in-memory transport)", () => {
  it("calls every tool successfully with typed arguments", async () => {
    const server = createMymindMcpServer({
      config: testConfig,
      client: createE2eMockMyMindClient()
    });
    const client = new Client({ name: "mymind-e2e", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      for (const name of MYMIND_TOOL_NAMES_ORDERED) {
        const args = e2eToolArguments[name];
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError, `${name}: ${JSON.stringify(result)}`).not.toBe(true);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("rejects unknown keys on strict tool input (mymind_list_objects)", async () => {
    const server = createMymindMcpServer({
      config: testConfig,
      client: createE2eMockMyMindClient()
    });
    const client = new Client({ name: "mymind-e2e", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const result = await client.callTool({
        name: "mymind_list_objects",
        arguments: { notARealField: true }
      });
      expect(result.isError).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("reads fixed and templated resources", async () => {
    const server = createMymindMcpServer({
      config: testConfig,
      client: createE2eMockMyMindClient()
    });
    const client = new Client({ name: "mymind-e2e", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const spaces = await client.readResource({ uri: "mymind://spaces" });
      expect(firstResourceText(spaces.contents)).toBeDefined();

      const tags = await client.readResource({ uri: "mymind://tags" });
      expect(firstResourceText(tags.contents)).toBeDefined();

      const obj = await client.readResource({ uri: "mymind://objects/obj_1" });
      expect(firstResourceText(obj.contents)).toContain("obj_1");

      const body = await client.readResource({ uri: "mymind://objects/obj_1/content/markdown" });
      expect(firstResourceText(body.contents)).toBe("body");

      const oneSpace = await client.readResource({ uri: "mymind://spaces/s1" });
      expect(firstResourceText(oneSpace.contents)).toBeDefined();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("returns prompts with arguments", async () => {
    const server = createMymindMcpServer({
      config: testConfig,
      client: createE2eMockMyMindClient()
    });
    const client = new Client({ name: "mymind-e2e", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const search = await client.getPrompt({
        name: "search_mymind",
        arguments: { query: "tax docs", useSemantic: "false" }
      });
      expect(JSON.stringify(search.messages)).toContain("mymind_search_objects");

      const summarize = await client.getPrompt({
        name: "summarize_mymind_object",
        arguments: { id: "obj_1", format: "markdown" }
      });
      expect(JSON.stringify(summarize.messages)).toContain("mymind_get_object");

      const save = await client.getPrompt({
        name: "save_to_mymind",
        arguments: { source: "https://example.com", kind: "url" }
      });
      expect(JSON.stringify(save.messages)).toContain("mymind_create_object");

      const org = await client.getPrompt({
        name: "organize_mymind_object",
        arguments: { id: "obj_1" }
      });
      expect(JSON.stringify(org.messages)).toContain("mymind_add_object_tags");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
