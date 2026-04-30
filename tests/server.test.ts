import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMymindMcpServer } from "../src/server.js";

const testConfig = {
  kid: "kid",
  secret: Buffer.from("secret").toString("base64"),
  apiBaseUrl: "https://api.mymind.com",
  userAgent: "test",
  allowedFileRoots: []
};

describe("createMymindMcpServer", () => {
  it("creates an MCP server instance", () => {
    const server = createMymindMcpServer({
      config: testConfig
    });

    expect(server).toBeDefined();
  });

  it("exposes MyMind tools, resources, resource templates, and prompts", async () => {
    const server = createMymindMcpServer({ config: testConfig });
    const client = new Client({ name: "mymind-test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const tools = await client.listTools();
      const resources = await client.listResources();
      const resourceTemplates = await client.listResourceTemplates();
      const prompts = await client.listPrompts();

      expect(client.getInstructions()).toContain("mymind");
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "mymind_add_object_spaces",
        "mymind_add_object_tags",
        "mymind_add_object_to_space",
        "mymind_convert_content",
        "mymind_create_object",
        "mymind_create_space",
        "mymind_delete_object",
        "mymind_delete_space",
        "mymind_download_object",
        "mymind_find_related_objects",
        "mymind_get_object",
        "mymind_get_object_content",
        "mymind_get_space",
        "mymind_list_objects",
        "mymind_list_spaces",
        "mymind_list_tags",
        "mymind_pin_object",
        "mymind_remove_object_from_space",
        "mymind_replace_note_content",
        "mymind_restore_object",
        "mymind_search_objects",
        "mymind_unpin_object",
        "mymind_update_object",
        "mymind_update_space"
      ]);
      expect(resources.resources.map((resource) => resource.uri).sort()).toEqual([
        "mymind://spaces",
        "mymind://tags"
      ]);
      expect(resourceTemplates.resourceTemplates.map((resource) => resource.uriTemplate).sort()).toEqual([
        "mymind://objects/{id}",
        "mymind://objects/{id}/content/{format}",
        "mymind://spaces/{id}"
      ]);
      expect(prompts.prompts.map((prompt) => prompt.name).sort()).toEqual([
        "organize_mymind_object",
        "save_to_mymind",
        "search_mymind",
        "summarize_mymind_object"
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
