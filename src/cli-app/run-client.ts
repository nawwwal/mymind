import { loadConfig } from "../config.js";
import type { MymindMcpConfig } from "../config.js";
import { MyMindClient } from "../mymind/index.js";

export async function withClient<T>(
  fn: (client: MyMindClient, config: MymindMcpConfig) => Promise<T>
): Promise<T> {
  const config = await loadConfig();
  const client = new MyMindClient({
    kid: config.kid,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl,
    userAgent: config.userAgent
  });
  return fn(client, config);
}
