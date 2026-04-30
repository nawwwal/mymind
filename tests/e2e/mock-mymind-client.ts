import type { MyMindClient, MyMindResponse } from "../../src/mymind/index.js";

function ok<T>(data: T): MyMindResponse<T> {
  return {
    data,
    rateLimit: { raw: {} }
  };
}

/** Minimal stub covering every MCP tool + resource code path (no real HTTP). */
export function createE2eMockMyMindClient(): MyMindClient {
  return {
    listObjects: async () => ok([]),
    getObject: async () => ok({ id: "obj_1" }),
    createObject: async () => ok({ id: "obj_new" }),
    createObjectFromFile: async () => ok({ id: "obj_file" }),
    updateObject: async () => ok({ id: "obj_1" }),
    deleteObject: async () => ok({}),
    findRelatedObjects: async () => ok([]),
    requestRaw: async () => ({
      response: new Response("plain", { headers: { "Content-Type": "text/plain" } }),
      rateLimit: {}
    }),
    getObjectContent: async () => ok("body"),
    replaceObjectContent: async () => ok({}),
    addObjectTags: async () => ok({}),
    addObjectSpaces: async () => ok({}),
    pinObject: async () => ok({}),
    unpinObject: async () => ok({}),
    restoreObject: async () => ok({}),
    listSpaces: async () => ok([]),
    getSpace: async () => ok({ id: "space_1" }),
    createSpace: async () => ok({ id: "space_new" }),
    updateSpace: async () => ok({ id: "space_1" }),
    deleteSpace: async () => ok({}),
    addObjectToSpace: async () => ok({}),
    removeObjectFromSpace: async () => ok({}),
    listTags: async () => ok([]),
    search: async () => ok([]),
    convert: async () => ok("converted")
  } as unknown as MyMindClient;
}
