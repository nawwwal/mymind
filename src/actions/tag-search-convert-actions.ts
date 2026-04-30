import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MyMindClientInterface } from "../mymind/client-interface.js";
import type { SearchInput } from "../mymind/client.js";
import { requireHighCostSearchConfirm } from "./confirm.js";
import { dryRunResult, jsonResult } from "./mcp-result.js";

export async function mymindListTagsAction(
  client: MyMindClientInterface,
  input: { limit?: number | undefined }
): Promise<CallToolResult> {
  return jsonResult(await client.listTags({ limit: input.limit }));
}

export async function mymindSearchObjectsAction(
  client: MyMindClientInterface,
  input: SearchInput & {
    q: string;
    dryRun?: boolean | undefined;
    confirmHighCost?: true | undefined;
  }
): Promise<CallToolResult> {
  const { confirmHighCost, dryRun, ...rest } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_search_objects", rest as Record<string, unknown>);
  }
  requireHighCostSearchConfirm(confirmHighCost, rest.semantic, rest.rerank);
  return jsonResult(await client.search(rest));
}

export async function mymindConvertContentAction(
  client: MyMindClientInterface,
  input: {
    content: string | Record<string, unknown>;
    from: "text/plain" | "text/markdown" | "application/prose+json";
    to: "text/plain" | "text/markdown" | "application/prose+json";
  }
): Promise<CallToolResult> {
  const { content, from, to } = input;
  if (from === to) {
    throw new Error("Convert requires different from and to formats.");
  }
  return jsonResult(await client.convert({ content, from, to }));
}
