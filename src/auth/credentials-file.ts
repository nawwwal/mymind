import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface CredentialsFileShape {
  v: number;
  profiles?: Record<string, { kid: string; secret: string; lastValidatedAt?: string }>;
}

export function credentialsFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "mymind", "credentials.json");
}

export async function tryLoadCredentialsFromFile(
  env: NodeJS.ProcessEnv = process.env
): Promise<{ kid: string; secret: string } | null> {
  const path = credentialsFilePath(env);
  try {
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw) as CredentialsFileShape;
    const profile = data.profiles?.default ?? data.profiles?.personal;
    if (profile?.kid && profile?.secret) {
      return { kid: profile.kid, secret: profile.secret };
    }
  } catch {
    return null;
  }
  return null;
}

export async function deleteCredentialsFile(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  try {
    await unlink(credentialsFilePath(env));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function writeCredentialsFile(
  kid: string,
  secret: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const path = credentialsFilePath(env);
  await mkdir(dirname(path), { recursive: true });
  const payload: CredentialsFileShape = {
    v: 1,
    profiles: {
      default: {
        kid,
        secret,
        lastValidatedAt: new Date().toISOString()
      }
    }
  };
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
}
