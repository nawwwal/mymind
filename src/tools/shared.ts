import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export type QueryParams = Record<string, QueryValue>;

export interface MymindRequestOptions {
  method?: string;
  path: string;
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  accept?: string;
}

export interface MymindResponse<T = unknown> {
  data: T;
  rateLimit?: unknown;
}

export interface ExpectedMymindClient {
  request<T = unknown>(options: MymindRequestOptions): Promise<MymindResponse<T>>;
  [methodName: string]: unknown;
}

export function jsonToolResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: stringifyJson(value)
      }
    ]
  };
}

export function jsonResourceResult(uri: string, value: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: stringifyJson(value)
      }
    ]
  };
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null, jsonReplacer, 2) ?? "null";
}

export async function requestClient<T = unknown>(
  client: ExpectedMymindClient,
  options: MymindRequestOptions
): Promise<MymindResponse<T>> {
  const requestOptions: MymindRequestOptions = {
    path: options.path
  };

  if (options.method !== undefined) {
    requestOptions.method = options.method;
  }

  if (options.query !== undefined) {
    requestOptions.query = options.query;
  }

  if (options.body !== undefined) {
    requestOptions.body = options.body;
  }

  if (options.headers !== undefined) {
    requestOptions.headers = options.headers;
  }

  if (options.accept !== undefined) {
    requestOptions.accept = options.accept;
  }

  return client.request<T>(requestOptions);
}

export async function callClientMethod<T = unknown>(
  client: ExpectedMymindClient,
  methodNames: string[],
  args: unknown[],
  fallback: () => Promise<T>
): Promise<T> {
  for (const methodName of methodNames) {
    const method = client[methodName];
    if (typeof method === "function") {
      return (await Reflect.apply(method, client, args)) as T;
    }
  }

  return fallback();
}

export function withoutUndefined(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function firstVariable(value: unknown, name: string): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error(`Missing resource variable: ${name}`);
  }

  return candidate;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
}
