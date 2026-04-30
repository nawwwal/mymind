import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createServerConfig,
  parseArgs,
  replaceTomlSection,
  updateClaudeDesktopConfig,
  updateCodexConfig,
  updateCursorConfig
} from "../src/install.js";

const serverConfig = createServerConfig({
  kid: "kid_123",
  secret: "secret_456"
});

describe("installer config helpers", () => {
  it("creates the standard npx server config", () => {
    expect(serverConfig).toEqual({
      command: "npx",
      args: ["-y", "@nawwal/mymind"],
      env: {
        MYMIND_KID: "kid_123",
        MYMIND_SECRET: "secret_456"
      }
    });
  });

  it("creates bin-only config without embedded secrets", () => {
    expect(createServerConfig(null, "@nawwal/mymind", true)).toEqual({
      command: "npx",
      args: ["-y", "@nawwal/mymind", "mcp"],
      env: {}
    });
  });

  it("parses client selection and safe defaults", () => {
    expect(parseArgs([])).toMatchObject({
      clients: "auto",
      dryRun: false,
      yes: false,
      noInput: false,
      useBinOnly: false,
      scope: "user"
    });

    expect(parseArgs(["--clients=codex,cursor", "--dry-run", "--yes", "--scope=project"])).toMatchObject({
      clients: ["codex", "cursor"],
      dryRun: true,
      yes: true,
      scope: "project"
    });

    expect(parseArgs(["--no-input", "--use-bin-only"])).toMatchObject({
      noInput: true,
      useBinOnly: true
    });
  });

  it("writes Claude Desktop JSON config without disturbing other servers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mymind-install-"));
    const path = join(dir, "claude_desktop_config.json");

    await writeFile(
      path,
      JSON.stringify({
        mcpServers: {
          existing: {
            command: "node",
            args: ["server.js"]
          }
        }
      }),
      "utf8"
    );

    await updateClaudeDesktopConfig(path, serverConfig);

    const config = JSON.parse(await readFile(path, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };

    expect(config.mcpServers.existing).toEqual({
      command: "node",
      args: ["server.js"]
    });
    expect(config.mcpServers.mymind).toEqual(serverConfig);
  });

  it("writes Cursor MCP JSON config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mymind-install-"));
    const path = join(dir, "mcp.json");

    await updateCursorConfig(path, serverConfig);

    const config = JSON.parse(await readFile(path, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };

    expect(config.mcpServers.mymind).toEqual(serverConfig);
  });

  it("replaces only the mymind Codex TOML section", () => {
    const source = [
      "[profile]",
      'name = "default"',
      "",
      "[mcp_servers.mymind]",
      'command = "old"',
      'args = ["old"]',
      "",
      "[mcp_servers.other]",
      'command = "node"'
    ].join("\n");

    const replaced = replaceTomlSection(
      source,
      "mcp_servers.mymind",
      ['[mcp_servers.mymind]', 'command = "npx"', 'args = ["-y", "@nawwal/mymind"]'].join("\n")
    );

    expect(replaced).toContain('[profile]\nname = "default"');
    expect(replaced).toContain('[mcp_servers.mymind]\ncommand = "npx"');
    expect(replaced).toContain('[mcp_servers.other]\ncommand = "node"');
    expect(replaced).not.toContain('command = "old"');
  });

  it("writes Codex TOML config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mymind-install-"));
    const path = join(dir, "config.toml");

    await updateCodexConfig(path, serverConfig);

    const config = await readFile(path, "utf8");

    expect(config).toContain("[mcp_servers.mymind]");
    expect(config).toContain('command = "npx"');
    expect(config).toContain('args = ["-y", "@nawwal/mymind"]');
    expect(config).toContain('MYMIND_KID = "kid_123"');
    expect(config).toContain('MYMIND_SECRET = "secret_456"');
  });
});
