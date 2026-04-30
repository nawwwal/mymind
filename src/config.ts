export interface MymindMcpConfig {
  kid: string;
  secret: string;
  apiBaseUrl: string;
  userAgent: string;
  allowedFileRoots: string[];
  outputDir?: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MymindMcpConfig {
  const kid = env.MYMIND_KID;
  const secret = env.MYMIND_SECRET;

  if (!kid || !secret) {
    throw new Error(
      "Missing MyMind credentials. Set MYMIND_KID and MYMIND_SECRET from https://access.mymind.com/extensions."
    );
  }

  return {
    kid,
    secret,
    apiBaseUrl: env.MYMIND_API_BASE ?? "https://api.mymind.com",
    userAgent: env.MYMIND_USER_AGENT ?? "@nawwal/mymind-mcp/0.1.0",
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
