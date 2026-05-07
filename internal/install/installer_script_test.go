package install

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestInstallerShellSyntax(t *testing.T) {
	runShellCheck(t, "-n", installerScriptPath(t))
}

func TestInstallerUsesQuietFailCurlWithStepText(t *testing.T) {
	script := readInstallerScript(t)

	for _, step := range []string{
		"Resolving latest mymind release...",
		"Downloading mymind release archive...",
		"Downloading checksums...",
	} {
		if !strings.Contains(script, step) {
			t.Fatalf("installer missing clear step text %q", step)
		}
	}

	for _, pattern := range []string{
		`curl -fsSLI`,
		`curl -fsSL "\$\{base_url\}/\$\{asset\}" -o "\$\{tmp\}/\$\{asset\}"`,
		`curl -fsSL "\$\{base_url\}/checksums.txt" -o "\$\{tmp\}/checksums.txt"`,
	} {
		if !regexp.MustCompile(pattern).MatchString(script) {
			t.Fatalf("installer missing quiet/fail curl form matching %s", pattern)
		}
	}
	if strings.Contains(script, `curl -fL "${base_url}/${asset}"`) {
		t.Fatalf("installer still uses raw curl progress for release archive")
	}
}

func TestInstallerDetectsSavedCredentialsBeforePrompting(t *testing.T) {
	script := readInstallerScript(t)

	for _, helper := range []string{"config_path()", "load_saved_credentials()"} {
		if !strings.Contains(script, helper) {
			t.Fatalf("installer missing saved credential helper %s", helper)
		}
	}
	for _, token := range []string{`MYMIND_CONFIG`, `.config/mymind/config.toml`, `kid`, `secret`} {
		if !strings.Contains(script, token) {
			t.Fatalf("installer missing saved credential token %q", token)
		}
	}

	load := strings.Index(script, "\nload_saved_credentials || true\n")
	prompt := strings.Index(script, "Save mymind credentials now?")
	if load < 0 || prompt < 0 || load > prompt {
		t.Fatalf("saved credentials must be loaded before prompting")
	}
}

func TestInstallerWritesCurlInstallMetadata(t *testing.T) {
	script := readInstallerScript(t)

	if !strings.Contains(script, "write_install_metadata()") {
		t.Fatalf("installer missing install metadata helper")
	}
	for _, token := range []string{
		`.config/mymind/install.json`,
		`"method": "curl"`,
		`"version":`,
		`"repo":`,
		`"installed_at":`,
		`"install_dir":`,
		`"mymind_path":`,
		`"mymind_mcp_path":`,
		`"platform":`,
	} {
		if !strings.Contains(script, token) {
			t.Fatalf("installer metadata missing %q", token)
		}
	}

	installed := strings.Index(script, `say "Installed:"`)
	metadata := strings.LastIndex(script, "write_install_metadata")
	if installed < 0 || metadata < 0 || metadata < installed {
		t.Fatalf("install metadata should be written after binary install")
	}
}

func TestInstallerConfiguresCodexAndClaudeIdempotently(t *testing.T) {
	script := readInstallerScript(t)

	for _, helper := range []string{
		"configure_codex_mcp()",
		"configure_claude_code_mcp()",
	} {
		if !strings.Contains(script, helper) {
			t.Fatalf("installer missing MCP helper %s", helper)
		}
	}
	for _, token := range []string{
		"codex mcp remove mymind",
		"codex mcp add mymind",
		"claude mcp remove mymind",
		"claude mcp add mymind",
	} {
		if !strings.Contains(script, token) {
			t.Fatalf("installer missing repeat-safe MCP command %q", token)
		}
	}
	if strings.Contains(script, "codex mcp add mymind --env") && !strings.Contains(script, "codex mcp remove mymind") {
		t.Fatalf("codex MCP add is not guarded by remove/replace")
	}
}

func TestInstallerConfiguresClaudeCodeMCPWithUserScope(t *testing.T) {
	body := shellFunctionBody(t, readInstallerScript(t), "configure_claude_code_mcp")

	for _, command := range []string{
		"claude mcp remove mymind --scope user",
		`claude mcp add mymind "$mcp_path" --scope user`,
	} {
		if !strings.Contains(body, command) {
			t.Fatalf("configure_claude_code_mcp missing %q in:\n%s", command, body)
		}
	}
	if strings.Contains(body, "claude mcp remove mymind >/dev/null") {
		t.Fatalf("claude remove is missing explicit user scope:\n%s", body)
	}
}

func TestInstallerOnlyTreatsCredentialsAsConfigSourcedWhenBothCameFromConfig(t *testing.T) {
	script := readInstallerScript(t)
	body := shellFunctionBody(t, script, "load_saved_credentials")

	if !strings.Contains(script, "credentials_loaded_entirely_from_config()") {
		t.Fatalf("installer missing helper predicate for config-sourced credentials")
	}
	for _, token := range []string{
		"KID_FROM_CONFIG=1",
		"SECRET_FROM_CONFIG=1",
		"credentials_loaded_entirely_from_config",
		"CREDENTIALS_FROM_CONFIG=1",
	} {
		if !strings.Contains(body, token) {
			t.Fatalf("load_saved_credentials missing %q in:\n%s", token, body)
		}
	}
	if strings.Contains(body, "CREDENTIALS_FROM_CONFIG=1\n  say") {
		t.Fatalf("load_saved_credentials marks config-sourced credentials unconditionally:\n%s", body)
	}
}

func TestInstallerCredentialPrecedenceRunsInShell(t *testing.T) {
	tests := []struct {
		name           string
		envKid         string
		envSecret      string
		configKid      string
		configSecret   string
		wantKid        string
		wantSecret     string
		wantFromConfig string
	}{
		{
			name:           "env kid and config secret",
			envKid:         "env-kid",
			configSecret:   "config-secret",
			wantKid:        "env-kid",
			wantSecret:     "config-secret",
			wantFromConfig: "0",
		},
		{
			name:           "config kid and env secret",
			envSecret:      "env-secret",
			configKid:      "config-kid",
			wantKid:        "config-kid",
			wantSecret:     "env-secret",
			wantFromConfig: "0",
		},
		{
			name:           "config kid and config secret",
			configKid:      "config-kid",
			configSecret:   "config-secret",
			wantKid:        "config-kid",
			wantSecret:     "config-secret",
			wantFromConfig: "1",
		},
		{
			name:           "env kid and env secret override stale config",
			envKid:         "env-kid",
			envSecret:      "env-secret",
			configKid:      "stale-kid",
			configSecret:   "stale-secret",
			wantKid:        "env-kid",
			wantSecret:     "env-secret",
			wantFromConfig: "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configPath := writeCredentialConfig(t, tt.configKid, tt.configSecret)
			output := runCredentialPrelude(t, configPath, tt.envKid, tt.envSecret)

			for _, want := range []string{
				"KID=" + tt.wantKid,
				"SECRET=" + tt.wantSecret,
				"CREDENTIALS_FROM_CONFIG=" + tt.wantFromConfig,
			} {
				if !strings.Contains(output, want+"\n") {
					t.Fatalf("output missing %q:\n%s", want, output)
				}
			}
		})
	}
}

func TestInstallerJSONConfigureMCPWritesFreshConfigWithEscapedValues(t *testing.T) {
	requirePython3(t)
	file := filepath.Join(t.TempDir(), "mcp.json")
	commandPath := filepath.Join(t.TempDir(), `mymind "quoted" mcp`)
	kid := `kid "quoted"`
	secret := `secret \ quoted`

	output, err := runJSONConfigureMCP(t, file, commandPath, kid, secret)
	if err != nil {
		t.Fatalf("json_configure_mcp failed: %v\n%s", err, output)
	}

	var data struct {
		MCPServers map[string]struct {
			Command string            `json:"command"`
			Env     map[string]string `json:"env"`
		} `json:"mcpServers"`
	}
	raw, err := os.ReadFile(file)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		t.Fatalf("fresh MCP config is invalid JSON: %v\n%s", err, raw)
	}
	server := data.MCPServers["mymind"]
	if server.Command != commandPath {
		t.Fatalf("command = %q, want %q", server.Command, commandPath)
	}
	if server.Env["MYMIND_KID"] != kid || server.Env["MYMIND_SECRET"] != secret {
		t.Fatalf("env = %#v, want kid/secret preserved", server.Env)
	}
}

func TestInstallerJSONConfigureMCPRejectsInvalidExistingJSON(t *testing.T) {
	requirePython3(t)
	file := filepath.Join(t.TempDir(), "mcp.json")
	original := []byte("{not valid json\n")
	if err := os.WriteFile(file, original, 0o600); err != nil {
		t.Fatal(err)
	}

	output, err := runJSONConfigureMCP(t, file, "/tmp/mymind-mcp", "kid", "secret")
	if err == nil {
		t.Fatalf("json_configure_mcp succeeded for invalid existing JSON:\n%s", output)
	}
	if !strings.Contains(output, "invalid JSON") {
		t.Fatalf("failure should name invalid JSON, got:\n%s", output)
	}
	after, err := os.ReadFile(file)
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != string(original) {
		t.Fatalf("invalid existing JSON was modified:\n%s", after)
	}
}

func TestInstallerMenuSupportsRecommendedChooseSkipAndEnvModes(t *testing.T) {
	script := readInstallerScript(t)

	for _, text := range []string{
		"MCP setup",
		"1) Update all detected clients",
		"2) Choose clients",
		"3) Skip",
		"Choose [1]:",
		`MYMIND_SETUP_MCP`,
		`SETUP_MCP" = "all"`,
		`SETUP_MCP="none"`,
	} {
		if !strings.Contains(script, text) {
			t.Fatalf("installer menu/env behavior missing %q", text)
		}
	}
}

func readInstallerScript(t *testing.T) string {
	t.Helper()
	data, err := os.ReadFile(installerScriptPath(t))
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func installerScriptPath(t *testing.T) string {
	t.Helper()
	return filepath.Join("..", "..", "install.sh")
}

func shellFunctionBody(t *testing.T, script, name string) string {
	t.Helper()
	startNeedle := name + "() {\n"
	start := strings.Index(script, startNeedle)
	if start < 0 {
		t.Fatalf("missing shell function %s", name)
	}
	bodyStart := start + len(startNeedle)
	end := strings.Index(script[bodyStart:], "\n}\n")
	if end < 0 {
		t.Fatalf("missing end of shell function %s", name)
	}
	return script[bodyStart : bodyStart+end]
}

func writeCredentialConfig(t *testing.T, kid, secret string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.toml")
	var lines []string
	if kid != "" {
		lines = append(lines, `kid = "`+kid+`"`)
	}
	if secret != "" {
		lines = append(lines, `secret = "`+secret+`"`)
	}
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func runCredentialPrelude(t *testing.T, configPath, envKid, envSecret string) string {
	t.Helper()
	script := readInstallerScript(t)
	marker := "\nneed curl\n"
	idx := strings.Index(script, marker)
	if idx < 0 {
		t.Fatalf("installer missing install-body marker %q", marker)
	}

	harness := script[:idx] + `
load_saved_credentials >/dev/null || true
printf 'KID=%s\n' "$KID"
printf 'SECRET=%s\n' "$SECRET"
printf 'CREDENTIALS_FROM_CONFIG=%s\n' "$CREDENTIALS_FROM_CONFIG"
`
	path := filepath.Join(t.TempDir(), "credential-harness.sh")
	if err := os.WriteFile(path, []byte(harness), 0o700); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("sh", path)
	cmd.Env = append(os.Environ(),
		"MYMIND_CONFIG="+configPath,
		"MYMIND_KID="+envKid,
		"MYMIND_SECRET="+envSecret,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("credential harness failed: %v\n%s", err, output)
	}
	return string(output)
}

func runJSONConfigureMCP(t *testing.T, file, commandPath, kid, secret string) (string, error) {
	t.Helper()
	harness := installerHelperPrelude(t) + `
json_configure_mcp "$TEST_MCP_FILE" "$TEST_COMMAND_PATH"
`
	path := filepath.Join(t.TempDir(), "json-configure-harness.sh")
	if err := os.WriteFile(path, []byte(harness), 0o700); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("sh", path)
	cmd.Env = append(os.Environ(),
		"TEST_MCP_FILE="+file,
		"TEST_COMMAND_PATH="+commandPath,
		"MYMIND_KID="+kid,
		"MYMIND_SECRET="+secret,
	)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func installerHelperPrelude(t *testing.T) string {
	t.Helper()
	script := readInstallerScript(t)
	marker := "\nneed curl\n"
	idx := strings.Index(script, marker)
	if idx < 0 {
		t.Fatalf("installer missing install-body marker %q", marker)
	}
	return script[:idx]
}

func requirePython3(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 is required for JSON-backed installer config tests")
	}
}

func runShellCheck(t *testing.T, args ...string) {
	t.Helper()
	cmd := exec.Command("sh", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("sh %s failed: %v\n%s", strings.Join(args, " "), err, output)
	}
}
