import { loadConfig } from "../config.js";
import type { MymindMcpConfig } from "../config.js";
import { MyMindClient } from "../mymind/index.js";

export async function withClient<T>(
  fn: (client: MyMindClient, config: MymindMcpConfig) => Promise<T>
): Promise<T> {
  const config = await loadConfig();
  const retryMax = process.env.MYMIND_RETRY_MAX ? Number(process.env.MYMIND_RETRY_MAX) : undefined;
  const client = new MyMindClient({
    kid: config.kid,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl,
    userAgent: config.userAgent,
    defaultRetryMax: Number.isFinite(retryMax) ? retryMax : undefined
  });
  return fn(client, config);
}
