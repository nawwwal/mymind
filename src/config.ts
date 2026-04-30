import { tryLoadCredentialsFromFile } from "./auth/credentials-file.js";
import { tryLoadCredentialsFromKeychain } from "./auth/store.js";

/** Default window from `iat` to `exp` for each request JWT (seconds). Every API call mints a new JWT. */
export const DEFAULT_JWT_VALIDITY_SECONDS = 86_400;

const MIN_JWT_VALIDITY_SECONDS = 60;
const MAX_JWT_VALIDITY_SECONDS = 604_800;

export interface MymindMcpConfig {
  kid: string;
  secret: string;
  apiBaseUrl: string;
  userAgent: string;
  allowedFileRoots: string[];
  /** Seconds added to `iat` for the `exp` claim on each signed request (clamped). */
  jwtValiditySeconds: number;
  outputDir?: string | undefined;
}

export function jwtValiditySecondsFromEnv(env: NodeJS.ProcessEnv): number {
  const raw = env.MYMIND_JWT_VALIDITY_SECONDS;
  if (raw === undefined || raw === "") {
    return DEFAULT_JWT_VALIDITY_SECONDS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return DEFAULT_JWT_VALIDITY_SECONDS;
  }
  return Math.min(MAX_JWT_VALIDITY_SECONDS, Math.max(MIN_JWT_VALIDITY_SECONDS, Math.trunc(n)));
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
    userAgent: env.MYMIND_USER_AGENT ?? "@nawwal/mymind/1.0.2",
    allowedFileRoots: splitPathList(env.MYMIND_ALLOWED_FILE_ROOTS),
    jwtValiditySeconds: jwtValiditySecondsFromEnv(env),
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
