import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MyMindResponse } from "../mymind/client.js";

export function jsonResult(result: MyMindResponse<unknown>): CallToolResult {
  return jsonContent({ data: result.data, rateLimit: result.rateLimit });
}

export function jsonContent(value: unknown): CallToolResult {
  const result: CallToolResult = {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
  if (isStructuredContent(value)) {
    result.structuredContent = value;
  }
  return result;
}

export function dryRunResult(action: string, preview: Record<string, unknown>): CallToolResult {
  return jsonContent({
    dryRun: true,
    action,
    preview: withoutUndefined(preview)
  });
}

export function withoutUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export function summarizeContent(content: string | Record<string, unknown>): Record<string, unknown> {
  if (typeof content === "string") {
    return {
      type: "text",
      length: content.length
    };
  }

  return {
    type: "object",
    keys: Object.keys(content)
  };
}

function isStructuredContent(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
