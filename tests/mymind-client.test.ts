import { createHmac } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MyMindClient,
  ObjectSchema,
  TagSchema,
  parseRateLimitMetadata
} from "../src/mymind/index.js";

type CapturedRequest = {
  url: URL;
  method: string;
  headers: Headers;
  body: BodyInit | null | undefined;
};

type ClientHarness = {
  client: MyMindClient;
  calls: CapturedRequest[];
};

type RequestCase = {
  name: string;
  call: (client: MyMindClient) => Promise<unknown>;
  response: Response;
  method: string;
  path: string;
  query?: Record<string, string[]>;
  jsonBody?: unknown;
  rawBody?: string;
  accept?: string;
  contentType?: string;
};

describe("MyMindClient", () => {
  it("signs requests with an HS256 JWT containing method and path only", async () => {
    const secret = Buffer.from("super-secret").toString("base64");
    const { client, calls } = createHarness({
      secret,
      response: jsonResponse([])
    });

    const response = await client.search({ q: "saved thing", limit: 10 });
    const headers = calls[0]?.headers ?? new Headers();
    const token = headers.get("Authorization")?.replace("Bearer ", "");
    const [encodedHeader, encodedPayload, signature] = token?.split(".") ?? [];

    expect(response.data).toEqual([]);
    expect(calls[0]?.url.pathname).toBe("/search");
    expect(calls[0]?.url.searchParams.get("q")).toBe("saved thing");
    expect(calls[0]?.url.searchParams.get("limit")).toBe("10");
    expect(headers.get("User-Agent")).toBe("mymind-test");
    expect(headers.get("Accept")).toBe("application/json");
    expect(JSON.parse(Buffer.from(encodedHeader ?? "", "base64url").toString("utf8"))).toEqual({
      alg: "HS256",
      kid: "kid-1"
    });
    expect(JSON.parse(Buffer.from(encodedPayload ?? "", "base64url").toString("utf8"))).toEqual({
      method: "GET",
      path: "/search"
    });

    const expectedSignature = createHmac("sha256", Buffer.from(secret, "base64"))
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");
    expect(signature).toBe(expectedSignature);
  });

  it.each([
    ["plain text", "secret"],
    ["illegal characters", "c2VjcmV0!"],
    ["bad length", "abcde"],
    ["internal whitespace", "c2Vj cmV0"],
    ["malformed padding", "c2=VjcmV0"]
  ])("rejects invalid base64 secrets: %s", (_name, secret) => {
    expect(() => {
      new MyMindClient({
        kid: "kid",
        secret,
        apiBaseUrl: "https://api.example.test"
      });
    }).toThrow("MyMind secret must be valid base64.");
  });

  it.each<RequestCase>([
    {
      name: "objects list",
      call: (client) => client.listObjects({ limit: 2 }),
      response: jsonResponse([{ id: "obj_1" }]),
      method: "GET",
      path: "/objects",
      query: { limit: ["2"] }
    },
    {
      name: "object get",
      call: (client) => client.getObject("obj 1"),
      response: jsonResponse({ id: "obj_1" }),
      method: "GET",
      path: "/objects/obj%201"
    },
    {
      name: "object create",
      call: (client) => client.createObject({ title: "Saved thing", url: "https://example.com" }),
      response: jsonResponse({ id: "obj_1" }),
      method: "POST",
      path: "/objects",
      jsonBody: { title: "Saved thing", url: "https://example.com" },
      contentType: "application/json"
    },
    {
      name: "object update",
      call: (client) => client.updateObject("obj 1", { title: "Updated thing" }),
      response: jsonResponse({ id: "obj_1" }),
      method: "PATCH",
      path: "/objects/obj%201",
      jsonBody: { title: "Updated thing" },
      contentType: "application/json"
    },
    {
      name: "object delete",
      call: (client) => client.deleteObject("obj 1"),
      response: jsonResponse({}),
      method: "DELETE",
      path: "/objects/obj%201"
    },
    {
      name: "object add tags",
      call: (client) => client.addObjectTags("obj 1", [{ name: "research", flags: 1 }]),
      response: jsonResponse({}),
      method: "POST",
      path: "/objects/obj%201/tags",
      jsonBody: [{ name: "research", flags: 1 }],
      contentType: "application/json"
    },
    {
      name: "object add spaces",
      call: (client) => client.addObjectSpaces("obj 1", [{ id: "space 1" }]),
      response: jsonResponse({}),
      method: "POST",
      path: "/objects/obj%201/spaces",
      jsonBody: [{ id: "space 1" }],
      contentType: "application/json"
    },
    {
      name: "related objects",
      call: (client) => client.findRelatedObjects("obj 1", { limit: 3 }),
      response: jsonResponse([]),
      method: "GET",
      path: "/objects/obj%201/related",
      query: { limit: ["3"] }
    },
    {
      name: "object download",
      call: (client) => client.downloadObject("obj 1"),
      response: textResponse("download"),
      method: "GET",
      path: "/objects/obj%201/download",
      accept: "*/*"
    },
    {
      name: "object content get",
      call: (client) => client.getObjectContent("obj 1", "text/markdown"),
      response: textResponse("# Note", "text/markdown"),
      method: "GET",
      path: "/objects/obj%201/content",
      accept: "text/markdown"
    },
    {
      name: "object content replace",
      call: (client) => client.replaceObjectContent("obj 1", "# Updated", "text/markdown"),
      response: jsonResponse({}),
      method: "PUT",
      path: "/objects/obj%201/content",
      rawBody: "# Updated",
      contentType: "text/markdown"
    },
    {
      name: "object pin",
      call: (client) => client.pinObject("obj 1", 4),
      response: jsonResponse({}),
      method: "POST",
      path: "/objects/obj%201/pin",
      jsonBody: { position: 4 },
      contentType: "application/json"
    },
    {
      name: "object unpin",
      call: (client) => client.unpinObject("obj 1"),
      response: jsonResponse({}),
      method: "DELETE",
      path: "/objects/obj%201/pin"
    },
    {
      name: "object restore",
      call: (client) => client.restoreObject("obj 1"),
      response: jsonResponse({}),
      method: "POST",
      path: "/objects/obj%201/restore"
    },
    {
      name: "spaces list",
      call: (client) => client.listSpaces({ limit: 2 }),
      response: jsonResponse([{ id: "space_1" }]),
      method: "GET",
      path: "/spaces",
      query: { limit: ["2"] }
    },
    {
      name: "space get",
      call: (client) => client.getSpace("space 1"),
      response: jsonResponse({ id: "space_1" }),
      method: "GET",
      path: "/spaces/space%201"
    },
    {
      name: "space create",
      call: (client) => client.createSpace({ name: "Reading", color: "#ff00aa" }),
      response: jsonResponse({ id: "space_1" }),
      method: "POST",
      path: "/spaces",
      jsonBody: { name: "Reading", color: "#ff00aa" },
      contentType: "application/json"
    },
    {
      name: "space update",
      call: (client) => client.updateSpace("space 1", { name: "Archive" }),
      response: jsonResponse({ id: "space_1" }),
      method: "PATCH",
      path: "/spaces/space%201",
      jsonBody: { name: "Archive" },
      contentType: "application/json"
    },
    {
      name: "space delete",
      call: (client) => client.deleteSpace("space 1"),
      response: jsonResponse({}),
      method: "DELETE",
      path: "/spaces/space%201"
    },
    {
      name: "space add object",
      call: (client) => client.addObjectToSpace("space 1", "obj 1"),
      response: jsonResponse({}),
      method: "PUT",
      path: "/spaces/space%201/objects/obj%201"
    },
    {
      name: "space remove object",
      call: (client) => client.removeObjectFromSpace("space 1", "obj 1"),
      response: jsonResponse({}),
      method: "DELETE",
      path: "/spaces/space%201/objects/obj%201"
    },
    {
      name: "tags list",
      call: (client) => client.listTags({ limit: 5 }),
      response: jsonResponse([{ name: "research" }]),
      method: "GET",
      path: "/tags",
      query: { limit: ["5"] }
    },
    {
      name: "entity get",
      call: (client) => client.getEntity("ent 1"),
      response: jsonResponse({ id: "ent_1", type: "person" }),
      method: "GET",
      path: "/entities/ent%201"
    },
    {
      name: "search GET query",
      call: (client) => client.search({ q: "deep work", limit: 4, semantic: true }),
      response: jsonResponse([]),
      method: "GET",
      path: "/search",
      query: { q: ["deep work"], limit: ["4"], semantic: ["true"] }
    },
    {
      name: "convert POST content negotiation",
      call: (client) => client.convert({ content: "hello", from: "text/plain", to: "text/markdown" }),
      response: textResponse("hello"),
      method: "POST",
      path: "/convert",
      rawBody: "hello",
      accept: "text/markdown",
      contentType: "text/plain"
    }
  ])("sends documented request contract for $name", async (testCase) => {
    const { client, calls } = createHarness({ response: testCase.response });

    await testCase.call(client);

    const call = calls[0];
    expect(call?.method).toBe(testCase.method);
    expect(call?.url.pathname).toBe(testCase.path);
    expectQuery(call?.url ?? new URL("https://api.example.test"), testCase.query);
    expect(call?.headers.get("Accept")).toBe(testCase.accept ?? "application/json");

    if (testCase.contentType === undefined) {
      expect(call?.headers.has("Content-Type")).toBe(false);
    } else {
      expect(call?.headers.get("Content-Type")).toBe(testCase.contentType);
    }

    if ("jsonBody" in testCase) {
      expect(call?.body).toBe(JSON.stringify(testCase.jsonBody));
    } else if (testCase.rawBody !== undefined) {
      expect(call?.body).toBe(testCase.rawBody);
    } else {
      expect(call?.body).toBeUndefined();
    }
  });

  it("does not expose undocumented tag detail support", () => {
    const { client } = createHarness({ response: jsonResponse([]) });

    expect((client as unknown as Record<string, unknown>).getTag).toBeUndefined();
  });

  it("uploads form metadata and blob without forcing JSON content type", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "mymind-client-"));
    const filePath = join(tempDir, "note.txt");

    try {
      await writeFile(filePath, "hello");

      const { client, calls } = createHarness({ response: jsonResponse({ id: "obj_1" }) });

      await client.createObjectFromFile(filePath, {
        title: "Local note",
        tags: [{ name: "test" }]
      });

      const body = calls[0]?.body;
      expect(calls[0]?.method).toBe("POST");
      expect(calls[0]?.url.pathname).toBe("/objects");
      expect(calls[0]?.headers.has("Content-Type")).toBe(false);
      expect(body).toBeInstanceOf(FormData);

      const formData = body as FormData;
      expect(formData.get("metadata")).toBe(JSON.stringify({ title: "Local note", tags: [{ name: "test" }] }));
      const blob = formData.get("blob");
      expect(blob).toBeInstanceOf(Blob);
      expect((blob as File).name).toBe("note.txt");
      expect((blob as Blob).type).toBe("text/plain");
      expect(await (blob as Blob).text()).toBe("hello");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("throws typed API errors for problem+json responses", async () => {
    const { client } = createHarness({
      response: new Response(
        JSON.stringify({
          type: "https://api.example.test/problems/rate-limited",
          title: "Too Many Requests",
          status: 429,
          detail: "Slow down."
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/problem+json",
            "RateLimit-Cost": "3"
          }
        }
      )
    });

    await expect(client.listObjects()).rejects.toMatchObject({
      name: "MyMindApiError",
      status: 429,
      problem: {
        title: "Too Many Requests",
        detail: "Slow down."
      },
      rateLimit: {
        cost: 3,
        raw: {
          rateLimitCost: "3"
        }
      }
    });
  });

  it("parses standard rate limit headers", () => {
    const metadata = parseRateLimitMetadata(
      new Headers({
        "RateLimit-Policy": "100;w=60;burst=10;comment=\"default\"",
        "RateLimit": "limit=100, remaining=42, reset=12",
        "RateLimit-Cost": "2"
      })
    );

    expect(metadata).toMatchObject({
      policy: [
        {
          limit: 100,
          quota: 100,
          window: 60,
          burst: 10,
          comment: "default"
        }
      ],
      limit: 100,
      remaining: 42,
      reset: 12,
      cost: 2
    });
  });

  it("parses MyMind named rate limit policies with q/w/r/t fields", () => {
    const metadata = parseRateLimitMetadata(
      new Headers({
        "RateLimit-Policy": "objects;q=100;w=60, search;q=20;w=60",
        "RateLimit": "objects;r=42;t=12",
        "RateLimit-Cost": "2"
      })
    );

    expect(metadata).toMatchObject({
      policy: [
        {
          name: "objects",
          limit: 100,
          quota: 100,
          window: 60,
          parameters: {
            q: 100,
            w: 60
          }
        },
        {
          name: "search",
          limit: 20,
          quota: 20,
          window: 60,
          parameters: {
            q: 20,
            w: 60
          }
        }
      ],
      limit: 100,
      remaining: 42,
      reset: 12,
      cost: 2
    });
  });

  it("keeps schemas permissive for extra MyMind fields while preserving documented shapes", () => {
    const parsedObject = ObjectSchema.parse({
      id: "obj_1",
      tags: [{ name: "research", unexpected: true }],
      unexpected: {
        nested: true
      }
    });
    const parsedTag = TagSchema.parse({
      name: "research",
      count: 10,
      extra: "still accepted"
    });

    expect(parsedObject.unexpected).toEqual({ nested: true });
    expect(parsedObject.tags?.[0]?.name).toBe("research");
    expect(parsedTag.extra).toBe("still accepted");
  });
});

function createHarness(options: {
  response: Response;
  secret?: string;
}): ClientHarness {
  const calls: CapturedRequest[] = [];
  const client = new MyMindClient({
    kid: "kid-1",
    secret: options.secret ?? Buffer.from("secret").toString("base64"),
    apiBaseUrl: "https://api.example.test",
    userAgent: "mymind-test",
    fetch: async (input, init) => {
      calls.push({
        url: toUrl(input),
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
        body: init?.body
      });
      return options.response.clone();
    }
  });

  return { client, calls };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "RateLimit": "limit=100, remaining=99, reset=60"
    }
  });
}

function textResponse(body: string, contentType = "text/plain"): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType
    }
  });
}

function toUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }

  if (typeof input === "string") {
    return new URL(input);
  }

  return new URL(input.url);
}

function expectQuery(url: URL, expected?: Record<string, string[]>): void {
  const expectedQuery = expected ?? {};
  const actualKeys = Array.from(new Set(url.searchParams.keys())).sort();
  const expectedKeys = Object.keys(expectedQuery).sort();

  expect(actualKeys).toEqual(expectedKeys);
  for (const [key, values] of Object.entries(expectedQuery)) {
    expect(url.searchParams.getAll(key)).toEqual(values);
  }
}
