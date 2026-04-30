import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { describe, expect, it } from "vitest";
import type { MymindMcpConfig } from "../src/config.js";
import type { MyMindClient, MyMindResponse } from "../src/mymind/index.js";
import { registerMymindPrompts } from "../src/prompts/index.js";
import { registerMymindResources } from "../src/resources/index.js";
import { registerMymindTools } from "../src/tools/index.js";

interface ToolRegistration {
  name: string;
  config: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

interface ResourceRegistration {
  name: string;
  readCallback: (uri: URL, variables?: Record<string, string | string[]>) => Promise<unknown>;
}

interface PromptRegistration {
  name: string;
  callback: (args: Record<string, string | undefined>) => unknown;
}

describe("MCP tools, resources, and prompts", () => {
  it("marks download as write-capable because outputFilename can write to disk", () => {
    const registry = createRegistry();
    registerMymindTools(registry.server, {
      client: createClient(),
      config: createConfig()
    });

    const download = registry.tools.get("mymind_download_object");
    const downloadSchema = download?.config.inputSchema as z.ZodObject<Record<string, z.ZodTypeAny>>;

    expect(download?.config.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(downloadSchema.shape).toHaveProperty("outputFilename");
    expect(downloadSchema.shape).toHaveProperty("confirmWrite");
    expect(downloadSchema.shape).toHaveProperty("dryRun");
  });

  it("returns structuredContent for JSON-compatible tool results", async () => {
    const registry = createRegistry();
    registerMymindTools(registry.server, {
      client: createClient({
        listObjects: async () => response([{ id: "obj_1" }])
      }),
      config: createConfig()
    });

    const result = await registry.tools.get("mymind_list_objects")?.handler({});

    expect(result).toMatchObject({
      structuredContent: {
        data: [{ id: "obj_1" }]
      }
    });
  });

  it("supports dry-run previews without bypassing live confirmations", async () => {
    const calls: string[] = [];
    const registry = createRegistry();
    registerMymindTools(registry.server, {
      client: createClient({
        deleteObject: async () => {
          calls.push("deleteObject");
          return response({});
        }
      }),
      config: createConfig()
    });

    const deleteTool = registry.tools.get("mymind_delete_object");
    await expect(deleteTool?.handler({ id: "obj_1" })).rejects.toThrow("confirmDelete=true");

    const dryRun = await deleteTool?.handler({ id: "obj_1", dryRun: true });

    expect(calls).toEqual([]);
    expect(dryRun).toMatchObject({
      structuredContent: {
        dryRun: true,
        action: "mymind_delete_object",
        preview: { id: "obj_1" }
      }
    });
  });

  it("uses real paths when validating upload roots", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "mymind-tools-"));
    const allowedDir = join(tempDir, "allowed");
    const outsideDir = join(tempDir, "outside");
    const allowedFile = join(allowedDir, "note.txt");
    const outsideFile = join(outsideDir, "secret.txt");
    const linkToOutside = join(allowedDir, "linked-secret.txt");
    const uploadedPaths: string[] = [];

    try {
      await mkdir(allowedDir);
      await mkdir(outsideDir);
      await writeFile(allowedFile, "safe");
      await writeFile(outsideFile, "outside");
      await symlink(outsideFile, linkToOutside);

      const registry = createRegistry();
      registerMymindTools(registry.server, {
        client: createClient({
          createObjectFromFile: async (filePath: string) => {
            uploadedPaths.push(filePath);
            return response({ id: "obj_1" });
          }
        }),
        config: createConfig({ allowedFileRoots: [allowedDir] })
      });

      const createTool = registry.tools.get("mymind_create_object");
      await expect(
        createTool?.handler({ filePath: linkToOutside, confirmHighCost: true })
      ).rejects.toThrow("outside MYMIND_ALLOWED_FILE_ROOTS");

      await createTool?.handler({ filePath: allowedFile, confirmHighCost: true });

      await expect(realpath(uploadedPaths[0] ?? "")).resolves.toBe(await realpath(allowedFile));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects output filenames that resolve outside the real output directory", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "mymind-downloads-"));
    const outputDir = join(tempDir, "output");
    const outsideDir = join(tempDir, "outside");
    const outsideFile = join(outsideDir, "leak.txt");
    const linkedOutput = join(outputDir, "leak.txt");

    try {
      await mkdir(outputDir);
      await mkdir(outsideDir);
      await writeFile(outsideFile, "do not overwrite");
      await symlink(outsideFile, linkedOutput);

      const registry = createRegistry();
      registerMymindTools(registry.server, {
        client: createClient({
          requestRaw: async () => ({
            response: new Response("downloaded", { headers: { "Content-Type": "text/plain" } }),
            rateLimit: {}
          })
        }),
        config: createConfig({ outputDir })
      });

      const downloadTool = registry.tools.get("mymind_download_object");
      await expect(
        downloadTool?.handler({ id: "obj_1", outputFilename: "leak.txt", confirmWrite: true })
      ).rejects.toThrow("outside MYMIND_OUTPUT_DIR");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("validates resource variables before calling the client", async () => {
    const registry = createRegistry();
    registerMymindResources(registry.server, {
      client: createClient({
        getObjectContent: async () => response("content")
      })
    });

    const contentResource = registry.resources.get("mymind_object_content");
    await expect(
      contentResource?.readCallback(new URL("mymind://objects/obj_1/content/xml"), {
        id: "obj_1",
        format: "xml"
      })
    ).rejects.toThrow("Invalid resource variable format");

    const objectResource = registry.resources.get("mymind_object");
    await expect(
      objectResource?.readCallback(new URL("mymind://objects/../tags"), { id: "../tags" })
    ).rejects.toThrow("Resource IDs must not contain");
  });

  it("keeps prompts aligned to registered tool names", () => {
    const registry = createRegistry();
    registerMymindTools(registry.server, {
      client: createClient(),
      config: createConfig()
    });
    registerMymindPrompts(registry.server);

    const toolNames = new Set(registry.tools.keys());
    for (const prompt of registry.prompts.values()) {
      const result = prompt.callback({ query: "receipts", useSemantic: "true", id: "obj_1", source: "hello", kind: "note" });
      const text = JSON.stringify(result);
      const referencedTools = text.match(/\bmymind_[a-z0-9_]+\b/g) ?? [];
      for (const toolName of referencedTools) {
        expect(toolNames.has(toolName), `${prompt.name} references ${toolName}`).toBe(true);
      }
    }
  });
});

function createRegistry() {
  const tools = new Map<string, ToolRegistration>();
  const resources = new Map<string, ResourceRegistration>();
  const prompts = new Map<string, PromptRegistration>();
  const server = {
    registerTool(name: string, config: Record<string, unknown>, handler: ToolRegistration["handler"]) {
      tools.set(name, { name, config, handler });
      return {};
    },
    registerResource(
      name: string,
      _uriOrTemplate: unknown,
      _config: Record<string, unknown>,
      readCallback: ResourceRegistration["readCallback"]
    ) {
      resources.set(name, { name, readCallback });
      return {};
    },
    registerPrompt(name: string, _config: Record<string, unknown>, callback: PromptRegistration["callback"]) {
      prompts.set(name, { name, callback });
      return {};
    }
  } as unknown as McpServer;

  return { server, tools, resources, prompts };
}

function createConfig(overrides: Partial<MymindMcpConfig> = {}): MymindMcpConfig {
  return {
    kid: "kid",
    secret: "secret",
    apiBaseUrl: "https://api.example.test",
    userAgent: "test",
    allowedFileRoots: [],
    ...overrides
  };
}

function createClient(overrides: Record<string, unknown> = {}): MyMindClient {
  return {
    listObjects: async () => response([]),
    deleteObject: async () => response({}),
    createObject: async () => response({ id: "obj_1" }),
    createObjectFromFile: async () => response({ id: "obj_1" }),
    requestRaw: async () => ({
      response: new Response("downloaded", { headers: { "Content-Type": "text/plain" } }),
      rateLimit: {}
    }),
    getObject: async () => response({ id: "obj_1" }),
    getObjectContent: async () => response("content"),
    listSpaces: async () => response([]),
    getSpace: async () => response({ id: "space_1" }),
    listTags: async () => response([]),
    ...overrides
  } as unknown as MyMindClient;
}

function response<T>(data: T): MyMindResponse<T> {
  return {
    data,
    rateLimit: {
      raw: {}
    }
  };
}
