import { spawnSync } from "node:child_process";

const KEYCHAIN_SERVICE = "com.nawwal.mymind";
const KEYCHAIN_ACCOUNT = "credentials";

export type CredentialLayer = "env" | "file" | "keychain";

export interface CredentialLayersStatus {
  env: boolean;
  file: boolean;
  keychain: boolean;
}

export function tryLoadCredentialsFromKeychain(): { kid: string; secret: string } | null {
  if (process.platform !== "darwin") {
    return null;
  }
  const result = spawnSync(
    "security",
    ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  if (result.status !== 0 || !result.stdout?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout.trim()) as { kid?: string; secret?: string };
    if (parsed.kid && parsed.secret) {
      return { kid: parsed.kid, secret: parsed.secret };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeCredentialsToKeychain(kid: string, secret: string): void {
  if (process.platform !== "darwin") {
    throw new Error("Keychain storage is only supported on macOS.");
  }
  const payload = JSON.stringify({ kid, secret });
  spawnSync("security", ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT], {
    encoding: "utf8"
  });
  const add = spawnSync(
    "security",
    ["add-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w", payload, "-U"],
    { encoding: "utf8" }
  );
  if (add.status !== 0) {
    const msg = add.stderr?.trim() || add.stdout?.trim() || "security add-generic-password failed";
    throw new Error(msg);
  }
}

export function deleteCredentialsFromKeychain(): void {
  if (process.platform !== "darwin") {
    return;
  }
  spawnSync("security", ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT], {
    encoding: "utf8"
  });
}

export function describeCredentialLayers(
  env: NodeJS.ProcessEnv,
  fileHasCreds: boolean
): { layers: CredentialLayersStatus; effective?: CredentialLayer } {
  const keychainCreds = tryLoadCredentialsFromKeychain();
  const layers: CredentialLayersStatus = {
    env: Boolean(env.MYMIND_KID && env.MYMIND_SECRET),
    file: fileHasCreds,
    keychain: Boolean(keychainCreds)
  };
  let effective: CredentialLayer | undefined;
  if (layers.env) effective = "env";
  else if (layers.file) effective = "file";
  else if (keychainCreds) effective = "keychain";
  return effective !== undefined ? { layers, effective } : { layers };
}
