import { tryLoadCredentialsFromFile } from "./auth/credentials-file.js";
import { tryLoadCredentialsFromKeychain } from "./auth/store.js";

export interface MymindMcpConfig {
  kid: string;
  secret: string;
  apiBaseUrl: string;
  userAgent: string;
  allowedFileRoots: string[];
  outputDir?: string | undefined;
}

export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<MymindMcpConfig> {
  let kid = env.MYMIND_KID;
  let secret = env.MYMIND_SECRET;

  if (!kid || !secret) {
    const fromFile = await tryLoadCredentialsFromFile(env);
    if (fromFile) {
      kid = fromFile.kid;
      secret = fromFile.secret;
    }
  }

  if (!kid || !secret) {
    const fromKeychain = tryLoadCredentialsFromKeychain();
    if (fromKeychain) {
      kid = fromKeychain.kid;
      secret = fromKeychain.secret;
    }
  }

  if (!kid || !secret) {
    throw new Error(
      "Missing MyMind credentials. Set MYMIND_KID and MYMIND_SECRET, run `mymind login`, or see https://access.mymind.com/extensions."
    );
  }

  return {
    kid,
    secret,
    apiBaseUrl: env.MYMIND_API_BASE ?? "https://api.mymind.com",
    userAgent: env.MYMIND_USER_AGENT ?? "@nawwal/mymind/1.0.0",
    allowedFileRoots: splitPathList(env.MYMIND_ALLOWED_FILE_ROOTS),
    outputDir: env.MYMIND_OUTPUT_DIR
  };
}

function splitPathList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
