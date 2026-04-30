import { createHmac } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { z } from "zod";
import { DEFAULT_JWT_VALIDITY_SECONDS } from "../config.js";
import {
  AnyResultSchema,
  ConvertResultSchema,
  EmptyObjectSchema,
  ObjectSchema,
  SearchResultSchema,
  SpaceSchema,
  TagSchema
} from "./schemas.js";
import type {
  MymindConvertResult,
  MymindObject,
  MymindSearchResult,
  MymindSpace,
  MymindTag
} from "./schemas.js";

export interface MyMindClientOptions {
  kid: string;
  secret: string;
  apiBaseUrl?: string;
  userAgent?: string;
  fetch?: typeof fetch;
  defaultRetryMax?: number | undefined;
  /** Seconds from `iat` to `exp` for each request JWT (default {@link DEFAULT_JWT_VALIDITY_SECONDS}). */
  jwtValiditySeconds?: number | undefined;
}

export interface MyMindRateLimitMetadata {
  policy?: RateLimitPolicyEntry[] | undefined;
  limit?: number | undefined;
  remaining?: number | undefined;
  reset?: number | undefined;
  cost?: number | undefined;
  retryAfterSeconds?: number | undefined;
  raw: {
    rateLimitPolicy?: string | undefined;
    rateLimit?: string | undefined;
    rateLimitCost?: string | undefined;
    retryAfter?: string | undefined;
  };
}

export interface RateLimitPolicyEntry {
  name?: string | undefined;
  limit?: number | undefined;
  quota?: number | undefined;
  window?: number | undefined;
  remaining?: number | undefined;
  reset?: number | undefined;
  burst?: number | undefined;
  comment?: string | undefined;
  parameters: Record<string, string | number | boolean>;
}

export interface MyMindResponse<T> {
  data: T;
  rateLimit: MyMindRateLimitMetadata;
  /** HTTP status from the successful response (e.g. 200 bumped vs 201 created). */
  httpStatus?: number | undefined;
}

export interface MyMindRawResponse {
  response: Response;
  rateLimit: MyMindRateLimitMetadata;
}

export interface MyMindProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export class MyMindApiError extends Error {
  readonly status: number;
  readonly problem?: MyMindProblemDetails;
  readonly rateLimit: MyMindRateLimitMetadata;
  readonly headers: Headers;
  readonly retryAfterSeconds?: number | undefined;

  constructor(options: {
    message: string;
    status: number;
    problem?: MyMindProblemDetails;
    rateLimit: MyMindRateLimitMetadata;
    headers: Headers;
    retryAfterSeconds?: number | undefined;
  }) {
    super(options.message);
    this.name = "MyMindApiError";
    this.status = options.status;
    if (options.problem !== undefined) {
      this.problem = options.problem;
    }
    this.rateLimit = options.rateLimit;
    this.headers = options.headers;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number | boolean>
>;

export interface MyMindRequestOptions {
  method?: string;
  path: string;
  query?: QueryParams | undefined;
  body?: unknown;
  headers?: HeadersInit;
  accept?: string;
  schema?: z.ZodTypeAny;
  signal?: AbortSignal | undefined;
  retryMax?: number | undefined;
}

export interface ListOptions extends QueryParams {
  limit?: number | undefined;
}

export interface ObjectCreateInput {
  url?: string | undefined;
  title?: string | undefined;
  content?: string | { type: string; body?: unknown } | undefined;
  tags?: Array<{ name: string; flags?: number | undefined }> | string[] | undefined;
  spaces?: Array<{ id: string }> | string[] | undefined;
  [key: string]: unknown;
}

export interface ObjectUpdateInput {
  title?: string | undefined;
  [key: string]: unknown;
}

export interface SpaceCreateInput {
  name: string;
  color?: string | undefined;
}

export interface SpaceUpdateInput {
  name?: string | undefined;
  color?: string | undefined;
}

export interface SearchInput {
  q?: string | undefined;
  limit?: number | undefined;
  semantic?: boolean | undefined;
  semanticBoost?: number | undefined;
  rerank?: boolean | undefined;
  similarTo?: string | undefined;
}

export interface ConvertInput {
  content: string | Record<string, unknown>;
  from: "text/plain" | "text/markdown" | "application/prose+json";
  to: "text/plain" | "text/markdown" | "application/prose+json";
}

export interface CreateObjectFromFileOptions extends ObjectCreateInput {
  fieldName?: string | undefined;
  filename?: string | undefined;
  mimeType?: string | undefined;
}

const DEFAULT_API_BASE_URL = "https://api.mymind.com";

const DEFAULT_USER_AGENT = "@nawwal/mymind/1.0.4";

/** Namespaced surface aligned with upstream `mymindcorp/api` client sketch. */
export interface MyMindObjectsNamespace {
  list: (options?: ListOptions) => Promise<MyMindResponse<MymindObject[] | unknown>>;
  get: (id: string) => Promise<MyMindResponse<MymindObject>>;
  create: (input: ObjectCreateInput) => Promise<MyMindResponse<MymindObject>>;
  createFromFile: (filePath: string, options?: CreateObjectFromFileOptions) => Promise<MyMindResponse<MymindObject>>;
  update: (id: string, input: ObjectUpdateInput) => Promise<MyMindResponse<MymindObject>>;
  delete: (id: string) => Promise<MyMindResponse<unknown>>;
  restore: (id: string) => Promise<MyMindResponse<unknown>>;
  findRelated: (id: string, options?: ListOptions) => Promise<MyMindResponse<unknown>>;
  blob: (id: string) => Promise<MyMindResponse<unknown>>;
  thumbnailRaw: (id: string, query?: { size?: string }) => Promise<MyMindRawResponse>;
  content: (
    id: string,
    format: "text/markdown" | "application/prose+json" | "text/html"
  ) => Promise<MyMindResponse<unknown>>;
  replaceContent: (
    id: string,
    content: string | Record<string, unknown>,
    contentType: "text/markdown" | "application/prose+json"
  ) => Promise<MyMindResponse<unknown>>;
  addTags: (
    objectId: string,
    tags: Array<{ name: string; flags?: number | undefined }>
  ) => Promise<MyMindResponse<unknown>>;
  addSpaces: (objectId: string, spaces: Array<{ id: string }>) => Promise<MyMindResponse<unknown>>;
  pin: (id: string, position?: number) => Promise<MyMindResponse<unknown>>;
  unpin: (id: string) => Promise<MyMindResponse<unknown>>;
}

export interface MyMindSpacesNamespace {
  list: (options?: ListOptions) => Promise<MyMindResponse<MymindSpace[] | unknown>>;
  get: (id: string) => Promise<MyMindResponse<MymindSpace>>;
  create: (input: SpaceCreateInput) => Promise<MyMindResponse<MymindSpace>>;
  update: (id: string, input: SpaceUpdateInput) => Promise<MyMindResponse<MymindSpace>>;
  delete: (id: string) => Promise<MyMindResponse<unknown>>;
  addObject: (spaceId: string, objectId: string) => Promise<MyMindResponse<unknown>>;
  removeObject: (spaceId: string, objectId: string) => Promise<MyMindResponse<unknown>>;
}

export interface MyMindTagsNamespace {
  list: (options?: ListOptions) => Promise<MyMindResponse<MymindTag[] | unknown>>;
}

export class MyMindClient {
  private readonly kid: string;
  private readonly secret: Buffer;
  private readonly apiBaseUrl: URL;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultRetryMax: number;
  private readonly jwtValiditySeconds: number;

  readonly objects: MyMindObjectsNamespace;
  readonly spaces: MyMindSpacesNamespace;
  readonly tags: MyMindTagsNamespace;

  constructor(options: MyMindClientOptions) {
    if (!options.kid) {
      throw new Error("MyMind kid is required.");
    }

    if (!options.secret) {
      throw new Error("MyMind secret is required.");
    }

    this.kid = options.kid;
    this.secret = decodeBase64Secret(options.secret);
    this.apiBaseUrl = new URL(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.fetchImpl = options.fetch ?? fetch;
    this.defaultRetryMax = options.defaultRetryMax ?? 3;
    this.jwtValiditySeconds = options.jwtValiditySeconds ?? DEFAULT_JWT_VALIDITY_SECONDS;

    this.objects = {
      list: (opts) => this.listObjects(opts),
      get: (id) => this.getObject(id),
      create: (input) => this.createObject(input),
      createFromFile: (fp, opts) => this.createObjectFromFile(fp, opts ?? {}),
      update: (id, input) => this.updateObject(id, input),
      delete: (id) => this.deleteObject(id),
      restore: (id) => this.restoreObject(id),
      findRelated: (id, opts) => this.findRelatedObjects(id, opts),
      blob: (id) => this.downloadObject(id),
      thumbnailRaw: (id, q) => this.getObjectThumbnailRaw(id, q),
      content: (id, format) => this.getObjectContent(id, format),
      replaceContent: (id, content, contentType) => this.replaceObjectContent(id, content, contentType),
      addTags: (objectId, tags) => this.addObjectTags(objectId, tags),
      addSpaces: (objectId, spaces) => this.addObjectSpaces(objectId, spaces),
      pin: (id, position) => this.pinObject(id, position),
      unpin: (id) => this.unpinObject(id)
    };

    this.spaces = {
      list: (opts) => this.listSpaces(opts),
      get: (id) => this.getSpace(id),
      create: (input) => this.createSpace(input),
      update: (id, input) => this.updateSpace(id, input),
      delete: (id) => this.deleteSpace(id),
      addObject: (spaceId, objectId) => this.addObjectToSpace(spaceId, objectId),
      removeObject: (spaceId, objectId) => this.removeObjectFromSpace(spaceId, objectId)
    };

    this.tags = {
      list: (opts) => this.listTags(opts)
    };
  }

  async request<T = unknown>(options: MyMindRequestOptions): Promise<MyMindResponse<T>> {
    const { response, rateLimit } = await this.requestRaw(options);

    const data = await parseResponseBody(response);
    const parsedData = options.schema ? options.schema.parse(data) : data;

    return {
      data: parsedData as T,
      rateLimit,
      httpStatus: response.status
    };
  }

  async requestRaw(options: MyMindRequestOptions): Promise<MyMindRawResponse> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = this.buildUrl(options.path, options.query);
    const pathForSignature = url.pathname;
    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${this.signRequest(method, pathForSignature)}`);
    headers.set("User-Agent", this.userAgent);

    if (options.accept) {
      headers.set("Accept", options.accept);
    } else if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const body = this.prepareBody(options.body, headers);

    const init: RequestInit = {
      method,
      headers,
      redirect: "follow"
    };
    if (options.signal !== undefined) {
      init.signal = options.signal;
    }
    if (body !== undefined) {
      init.body = body;
    }

    const retryMax = options.retryMax ?? this.defaultRetryMax;
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetchImpl(url, init);
      const rateLimit = parseRateLimitMetadata(response.headers);

      if (response.ok) {
        return {
          response,
          rateLimit
        };
      }

      if (attempt < retryMax && shouldRetry(method, response.status)) {
        await sleep(retryDelayMs(attempt, rateLimit.retryAfterSeconds), options.signal);
        continue;
      }

      throw await toApiError(response, rateLimit);
    }
  }

  async listObjects(options?: ListOptions): Promise<MyMindResponse<MymindObject[] | unknown>> {
    const request: MyMindRequestOptions = {
      path: "/objects",
      schema: listOrEnvelope(ObjectSchema)
    };
    if (options !== undefined) request.query = options;
    return this.request(request);
  }

  async getObject(id: string): Promise<MyMindResponse<MymindObject>> {
    return this.request({
      path: `/objects/${encodeURIComponent(id)}`,
      schema: ObjectSchema
    });
  }

  async createObject(input: ObjectCreateInput): Promise<MyMindResponse<MymindObject>> {
    return this.request({
      method: "POST",
      path: "/objects",
      body: input,
      schema: ObjectSchema
    });
  }

  async createObjectFromFile(
    filePath: string,
    options: CreateObjectFromFileOptions = {}
  ): Promise<MyMindResponse<MymindObject>> {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error(`Upload path is not a file: ${filePath}`);
    }

    const fileBuffer = await readFile(filePath);
    const formData = new FormData();
    const fieldName = options.fieldName ?? "blob";
    const filename = options.filename ?? basename(filePath);
    const mimeType = options.mimeType ?? inferMimeType(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });

    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options)) {
      if (key === "fieldName" || key === "filename" || key === "mimeType") {
        continue;
      }
      metadata[key] = value;
    }
    formData.append("metadata", JSON.stringify(metadata));
    formData.append(fieldName, blob, filename);

    return this.request({
      method: "POST",
      path: "/objects",
      body: formData,
      schema: ObjectSchema
    });
  }

  async updateObject(id: string, input: ObjectUpdateInput): Promise<MyMindResponse<MymindObject>> {
    return this.request({
      method: "PATCH",
      path: `/objects/${encodeURIComponent(id)}`,
      body: input,
      schema: ObjectSchema
    });
  }

  async deleteObject(id: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "DELETE",
      path: `/objects/${encodeURIComponent(id)}`
    });
  }

  async findRelatedObjects(id: string, options?: ListOptions): Promise<MyMindResponse<unknown>> {
    return this.search({
      similarTo: id,
      limit: options?.limit,
      semantic: true
    });
  }

  async getObjectThumbnailRaw(id: string, query?: { size?: string }): Promise<MyMindRawResponse> {
    return this.requestRaw({
      path: `/objects/${encodeURIComponent(id)}/thumbnail`,
      query: query?.size !== undefined ? { size: query.size } : undefined,
      accept: "*/*"
    });
  }

  async downloadObject(id: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      path: `/objects/${encodeURIComponent(id)}/blob`,
      accept: "*/*",
      schema: AnyResultSchema
    });
  }

  async getObjectContent(
    id: string,
    format: "text/markdown" | "application/prose+json" | "text/html"
  ): Promise<MyMindResponse<unknown>> {
    return this.request({
      path: `/objects/${encodeURIComponent(id)}/content`,
      accept: format,
      schema: AnyResultSchema
    });
  }

  async replaceObjectContent(
    id: string,
    content: string | Record<string, unknown>,
    contentType: "text/markdown" | "application/prose+json"
  ): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "PUT",
      path: `/objects/${encodeURIComponent(id)}/content`,
      body: content,
      headers: { "Content-Type": contentType },
      schema: EmptyObjectSchema
    });
  }

  async addObjectTags(
    objectId: string,
    tags: Array<{ name: string; flags?: number | undefined }>
  ): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "POST",
      path: `/objects/${encodeURIComponent(objectId)}/tags`,
      body: { tags },
      schema: EmptyObjectSchema
    });
  }

  async addObjectSpaces(objectId: string, spaces: Array<{ id: string }>): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "POST",
      path: `/objects/${encodeURIComponent(objectId)}/spaces`,
      body: spaces,
      schema: EmptyObjectSchema
    });
  }

  async pinObject(id: string, position?: number): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "POST",
      path: `/objects/${encodeURIComponent(id)}/pin`,
      body: position === undefined ? {} : { position },
      schema: EmptyObjectSchema
    });
  }

  async unpinObject(id: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "DELETE",
      path: `/objects/${encodeURIComponent(id)}/pin`,
      schema: EmptyObjectSchema
    });
  }

  async restoreObject(id: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "POST",
      path: `/objects/${encodeURIComponent(id)}/restore`,
      schema: EmptyObjectSchema
    });
  }

  async listSpaces(options?: ListOptions): Promise<MyMindResponse<MymindSpace[] | unknown>> {
    const request: MyMindRequestOptions = {
      path: "/spaces",
      schema: listOrEnvelope(SpaceSchema)
    };
    if (options !== undefined) request.query = options;
    return this.request(request);
  }

  async getSpace(id: string): Promise<MyMindResponse<MymindSpace>> {
    return this.request({
      path: `/spaces/${encodeURIComponent(id)}`,
      schema: SpaceSchema
    });
  }

  async createSpace(input: SpaceCreateInput): Promise<MyMindResponse<MymindSpace>> {
    return this.request({
      method: "POST",
      path: "/spaces",
      body: input,
      schema: SpaceSchema
    });
  }

  async updateSpace(id: string, input: SpaceUpdateInput): Promise<MyMindResponse<MymindSpace>> {
    return this.request({
      method: "PATCH",
      path: `/spaces/${encodeURIComponent(id)}`,
      body: input,
      schema: SpaceSchema
    });
  }

  async deleteSpace(id: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "DELETE",
      path: `/spaces/${encodeURIComponent(id)}`
    });
  }

  async addObjectToSpace(spaceId: string, objectId: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "PUT",
      path: `/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}`,
      schema: EmptyObjectSchema
    });
  }

  async removeObjectFromSpace(spaceId: string, objectId: string): Promise<MyMindResponse<unknown>> {
    return this.request({
      method: "DELETE",
      path: `/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}`,
      schema: EmptyObjectSchema
    });
  }

  async listTags(options?: ListOptions): Promise<MyMindResponse<MymindTag[] | unknown>> {
    const request: MyMindRequestOptions = {
      path: "/tags",
      schema: listOrEnvelope(TagSchema)
    };
    if (options !== undefined) request.query = options;
    return this.request(request);
  }

  async search(input: SearchInput): Promise<MyMindResponse<MymindSearchResult>> {
    const q =
      input.q !== undefined && input.q !== ""
        ? input.q
        : input.similarTo !== undefined
          ? "*"
          : undefined;
    if (q === undefined) {
      throw new Error("Search requires q or similarTo.");
    }
    return this.request({
      path: "/search",
      query: { ...input, q },
      schema: SearchResultSchema
    });
  }

  async convert(input: ConvertInput): Promise<MyMindResponse<MymindConvertResult>> {
    return this.request({
      method: "POST",
      path: "/convert",
      body: input.content,
      headers: { "Content-Type": input.from },
      accept: input.to,
      schema: ConvertResultSchema
    });
  }

  async whoami(): Promise<MyMindResponse<unknown>> {
    return this.request({
      path: "/objects",
      query: { limit: 1 },
      schema: AnyResultSchema
    });
  }

  signRequest(method: string, path: string): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const encodedHeader = base64UrlJson({ alg: "HS256", kid: this.kid });
    const encodedPayload = base64UrlJson({
      method: method.toUpperCase(),
      path,
      iat: nowSec,
      exp: nowSec + this.jwtValiditySeconds
    });
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", this.secret).update(signingInput).digest();

    return `${signingInput}.${base64Url(signature)}`;
  }

  private buildUrl(path: string, query?: QueryParams): URL {
    const url = new URL(path, this.apiBaseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue;
        }

        const values = Array.isArray(value) ? value : [value];
        for (const entry of values) {
          url.searchParams.append(key, String(entry));
        }
      }
    }

    return url;
  }

  private prepareBody(body: unknown, headers: Headers): BodyInit | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    if (isBodyInit(body)) {
      return body;
    }

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return JSON.stringify(body);
  }
}

function listOrEnvelope<T extends z.ZodTypeAny>(itemSchema: T): z.ZodTypeAny {
  return z
    .array(itemSchema)
    .or(
      z
        .object({
          data: z.array(itemSchema).optional(),
          items: z.array(itemSchema).optional(),
          results: z.array(itemSchema).optional(),
          nextCursor: z.string().optional(),
          next_cursor: z.string().optional()
        })
        .catchall(z.unknown())
    );
}

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  );
}

async function toApiError(
  response: Response,
  rateLimit: MyMindRateLimitMetadata
): Promise<MyMindApiError> {
  const contentType = response.headers.get("Content-Type") ?? "";
  let problem: MyMindProblemDetails | undefined;
  let fallbackMessage = response.statusText || `MyMind API request failed with status ${response.status}`;

  if (contentType.includes("application/problem+json") || contentType.includes("application/json")) {
    const body = await parseResponseBody(response);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      problem = body as MyMindProblemDetails;
      fallbackMessage =
        stringField(problem.title) ??
        stringField(problem.detail) ??
        fallbackMessage;
    }
  } else {
    const text = await response.text();
    if (text) {
      fallbackMessage = text;
    }
  }

  const errorOptions: ConstructorParameters<typeof MyMindApiError>[0] = {
    message: fallbackMessage,
    status: response.status,
    rateLimit,
    headers: response.headers,
    retryAfterSeconds: rateLimit.retryAfterSeconds
  };
  if (problem !== undefined) {
    errorOptions.problem = problem;
  }

  return new MyMindApiError(errorOptions);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("json")) {
    return JSON.parse(text);
  }

  return text;
}

export function parseRateLimitMetadata(headers: Headers): MyMindRateLimitMetadata {
  const rateLimitPolicy = headers.get("RateLimit-Policy") ?? undefined;
  const rateLimit = headers.get("RateLimit") ?? undefined;
  const rateLimitCost = headers.get("RateLimit-Cost") ?? undefined;
  const retryAfter = headers.get("Retry-After") ?? undefined;
  const parsedRateLimit = parseRateLimitHeader(rateLimit);
  const metadata: MyMindRateLimitMetadata = { raw: {} };

  if (rateLimitPolicy !== undefined) {
    metadata.policy = parseRateLimitPolicy(rateLimitPolicy);
    metadata.raw.rateLimitPolicy = rateLimitPolicy;
  }
  if (rateLimit !== undefined) {
    metadata.raw.rateLimit = rateLimit;
  }
  if (rateLimitCost !== undefined) {
    metadata.raw.rateLimitCost = rateLimitCost;
  }
  if (retryAfter !== undefined) {
    metadata.raw.retryAfter = retryAfter;
    metadata.retryAfterSeconds = parseRetryAfterSeconds(retryAfter);
  }
  if (parsedRateLimit.limit !== undefined) metadata.limit = parsedRateLimit.limit;
  if (metadata.limit === undefined && metadata.policy?.[0]?.limit !== undefined) {
    metadata.limit = metadata.policy[0].limit;
  }
  if (parsedRateLimit.remaining !== undefined) metadata.remaining = parsedRateLimit.remaining;
  if (parsedRateLimit.reset !== undefined) metadata.reset = parsedRateLimit.reset;
  const cost = parseHeaderNumber(rateLimitCost);
  if (cost !== undefined) metadata.cost = cost;

  return metadata;
}

function shouldRetry(method: string, status: number): boolean {
  if (status === 429) return true;
  if (status < 500) return false;
  return ["GET", "HEAD", "OPTIONS", "DELETE", "PUT"].includes(method);
}

function retryDelayMs(attempt: number, retryAfterSeconds: number | undefined): number {
  if (retryAfterSeconds !== undefined) return Math.max(0, retryAfterSeconds * 1000);
  return Math.min(8000, 250 * 2 ** attempt);
}

function parseRetryAfterSeconds(value: string): number | undefined {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.max(0, numeric);
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  return undefined;
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error("Aborted."));
      };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
  });
}

function parseRateLimitPolicy(value: string): RateLimitPolicyEntry[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [nameOrLimitPart, ...parameterParts] = entry.split(";").map((part) => part.trim());
      const parameters: Record<string, string | number | boolean> = {};
      const policy: RateLimitPolicyEntry = { parameters };
      const limit = parseHeaderNumber(nameOrLimitPart);

      if (limit !== undefined) {
        policy.limit = limit;
        policy.quota = limit;
      } else if (nameOrLimitPart) {
        policy.name = unquoteHeaderValue(nameOrLimitPart);
      }

      for (const part of parameterParts) {
        const [key, rawValue] = splitOnce(part, "=");
        if (!key) {
          continue;
        }

        const normalizedValue = normalizeHeaderValue(rawValue ?? "true");
        parameters[key] = normalizedValue;

        if ((key === "q" || key === "limit") && typeof normalizedValue === "number") {
          policy.limit = normalizedValue;
          policy.quota = normalizedValue;
        } else if (key === "w" && typeof normalizedValue === "number") {
          policy.window = normalizedValue;
        } else if ((key === "r" || key === "remaining") && typeof normalizedValue === "number") {
          policy.remaining = normalizedValue;
        } else if ((key === "t" || key === "reset") && typeof normalizedValue === "number") {
          policy.reset = normalizedValue;
        } else if (key === "burst" && typeof normalizedValue === "number") {
          policy.burst = normalizedValue;
        } else if (key === "comment" && typeof normalizedValue === "string") {
          policy.comment = normalizedValue;
        }
      }

      return policy;
    });
}

function parseRateLimitHeader(value: string | undefined): {
  limit?: number;
  remaining?: number;
  reset?: number;
} {
  if (!value) {
    return {};
  }

  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.some((part) => part.includes(";"))) {
    return parseNamedRateLimitEntry(parts[0]);
  }

  if (parts.every((part) => !part.includes("="))) {
    const parsed: { limit?: number; remaining?: number; reset?: number } = {};
    const limit = parseHeaderNumber(parts[0]);
    const remaining = parseHeaderNumber(parts[1]);
    const reset = parseHeaderNumber(parts[2]);
    if (limit !== undefined) parsed.limit = limit;
    if (remaining !== undefined) parsed.remaining = remaining;
    if (reset !== undefined) parsed.reset = reset;
    return parsed;
  }

  const parsed: { limit?: number; remaining?: number; reset?: number } = {};

  for (const part of parts) {
    const [key, rawValue] = splitOnce(part, "=");
    const numericValue = parseHeaderNumber(rawValue);

    if (numericValue === undefined) {
      continue;
    }

    if (key === "limit" || key === "q") {
      parsed.limit = numericValue;
    } else if (key === "remaining" || key === "r") {
      parsed.remaining = numericValue;
    } else if (key === "reset" || key === "t") {
      parsed.reset = numericValue;
    }
  }

  return parsed;
}

function parseNamedRateLimitEntry(value: string | undefined): {
  limit?: number;
  remaining?: number;
  reset?: number;
} {
  if (!value) {
    return {};
  }

  const [, ...parameterParts] = value.split(";").map((part) => part.trim());
  const parsed: { limit?: number; remaining?: number; reset?: number } = {};

  for (const part of parameterParts) {
    const [key, rawValue] = splitOnce(part, "=");
    const numericValue = parseHeaderNumber(rawValue);

    if (numericValue === undefined) {
      continue;
    }

    if (key === "q" || key === "limit") {
      parsed.limit = numericValue;
    } else if (key === "r" || key === "remaining") {
      parsed.remaining = numericValue;
    } else if (key === "t" || key === "reset") {
      parsed.reset = numericValue;
    }
  }

  return parsed;
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
  const index = value.indexOf(separator);
  if (index === -1) {
    return [value.trim(), undefined];
  }

  return [value.slice(0, index).trim(), value.slice(index + separator.length).trim()];
}

function normalizeHeaderValue(value: string): string | number | boolean {
  const unquoted = unquoteHeaderValue(value);

  if (unquoted === "true") {
    return true;
  }

  if (unquoted === "false") {
    return false;
  }

  return parseHeaderNumber(unquoted) ?? unquoted;
}

function unquoteHeaderValue(value: string): string {
  return value.replace(/^"|"$/g, "");
}

function parseHeaderNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value.replace(/^"|"$/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function decodeBase64Secret(secret: string): Buffer {
  const normalized = secret.trim();

  if (!normalized) {
    throw new Error("MyMind secret is required.");
  }

  if (
    /\s/.test(normalized) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    /=[^=]/.test(normalized) ||
    normalized.length % 4 === 1
  ) {
    throw new Error("MyMind secret must be valid base64.");
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = Buffer.from(padded, "base64");

  if (decoded.length === 0 || decoded.toString("base64").replace(/=+$/g, "") !== normalized.replace(/=+$/g, "")) {
    throw new Error("MyMind secret must be valid base64.");
  }

  return decoded;
}

function base64UrlJson(value: unknown): string {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(value: Buffer): string {
  return value.toString("base64url");
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function appendFormValue(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      appendFormValue(formData, key, entry);
    }
    return;
  }

  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
}


function inferMimeType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".apng": "image/apng",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".html": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".md": "text/markdown",
    ".mov": "video/quicktime",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain",
    ".webm": "video/webm",
    ".webp": "image/webp"
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}
