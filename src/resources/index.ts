import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodType, ZodTypeAny } from "zod";
import type { MyMindClient } from "../mymind/index.js";
import { resourceContentFormatSchema, resourceIdSchema } from "../schemas/resource-variables.js";

interface ResourceDependencies {
  client: MyMindClient;
}

export function registerMymindResources(server: McpServer, { client }: ResourceDependencies): void {
  server.registerResource(
    "mymind_object",
    new ResourceTemplate("mymind://objects/{id}", { list: undefined }),
    {
      title: "MyMind object",
      description: "Object metadata from MyMind.",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      assertResourceUri(uri, "objects");
      const id = firstVariable(variables.id, "id");
      const result = await client.getObject(id);
      return jsonResource(uri.href, result.data);
    }
  );

  server.registerResource(
    "mymind_object_content",
    new ResourceTemplate("mymind://objects/{id}/content/{format}", { list: undefined }),
    {
      title: "MyMind object content",
      description: "Text content for a MyMind object. Format must be markdown, html, or prose.",
      mimeType: "text/plain"
    },
    async (uri, variables) => {
      assertResourceUri(uri, "objects");
      const id = firstVariable(variables.id, "id");
      const format = firstVariable(variables.format, "format", resourceContentFormatSchema);
      const accept = formatToAccept(format);
      const result = await client.getObjectContent(id, accept);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: accept,
            text: typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "mymind_spaces",
    "mymind://spaces",
    {
      title: "MyMind spaces",
      description: "All MyMind spaces.",
      mimeType: "application/json"
    },
    async (uri) => {
      assertExactResourceUri(uri, "mymind://spaces");
      return jsonResource(uri.href, (await client.listSpaces()).data);
    }
  );

  server.registerResource(
    "mymind_space",
    new ResourceTemplate("mymind://spaces/{id}", { list: undefined }),
    {
      title: "MyMind space",
      description: "One MyMind space.",
      mimeType: "application/json"
    },
    async (uri, variables) => {
      assertResourceUri(uri, "spaces");
      return jsonResource(uri.href, (await client.getSpace(firstVariable(variables.id, "id"))).data);
    }
  );

  server.registerResource(
    "mymind_tags",
    "mymind://tags",
    {
      title: "MyMind tags",
      description: "All MyMind tags.",
      mimeType: "application/json"
    },
    async (uri) => {
      assertExactResourceUri(uri, "mymind://tags");
      return jsonResource(uri.href, (await client.listTags()).data);
    }
  );
}

function jsonResource(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function firstVariable(value: string | string[] | undefined, name: string): string;
function firstVariable<T>(value: string | string[] | undefined, name: string, schema: ZodType<T>): T;
function firstVariable(
  value: string | string[] | undefined,
  name: string,
  schema: ZodTypeAny = resourceIdSchema
): unknown {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = schema.safeParse(first);
  if (!parsed.success) {
    throw new Error(`Invalid resource variable ${name}: ${parsed.error.issues[0]?.message ?? "invalid value"}`);
  }
  return parsed.data;
}

function formatToAccept(format: string): "text/markdown" | "text/html" | "application/prose+json" {
  if (format === "markdown") return "text/markdown";
  if (format === "html") return "text/html";
  if (format === "prose") return "application/prose+json";
  throw new Error("format must be markdown, html, or prose.");
}

function assertResourceUri(uri: URL, collection: string): void {
  if (uri.protocol !== "mymind:" || uri.hostname !== collection) {
    throw new Error(`Invalid MyMind resource URI for ${collection}: ${uri.href}`);
  }
}

function assertExactResourceUri(uri: URL, expected: string): void {
  if (uri.href !== expected) {
    throw new Error(`Invalid MyMind resource URI. Expected ${expected}.`);
  }
}
