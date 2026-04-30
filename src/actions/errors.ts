import type { MyMindApiError } from "../mymind/client.js";

/** Sysexits-aligned exit codes (CLI); MCP tools throw Errors instead. */
export const Exit = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  AUTH: 3,
  NOT_FOUND: 4,
  RATE_LIMIT: 5,
  CONFIRM: 6,
  DRY_RUN: 7,
  UPSTREAM: 64,
  SIGINT: 130,
  SIGPIPE: 141
} as const;

export function exitCodeForApiError(api: MyMindApiError): number {
  if (api.status === 401 || api.status === 403) return Exit.AUTH;
  if (api.status === 404) return Exit.NOT_FOUND;
  if (api.status === 429) return Exit.RATE_LIMIT;
  return Exit.UPSTREAM;
}
