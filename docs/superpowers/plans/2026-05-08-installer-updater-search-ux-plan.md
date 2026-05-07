# Installer Updater Search UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make curl installs repeat-safe, add `mymind update`, and improve human search output without changing agent JSON behavior.

**Architecture:** Put durable detection and update planning in a small Go package under `internal/install`; the shell installer remains a bootstrapper and uses idempotent config checks. Search gets a command-specific human renderer so the generic table truncation behavior can remain unchanged for other commands.

**Tech Stack:** Go, Cobra, POSIX `sh`, GitHub release assets, Homebrew CLI, Codex/Claude/Cursor/Claude Desktop MCP config files.

---

## File Structure

- Create `internal/install/metadata.go`: install metadata type, load/save helpers, path constants.
- Create `internal/install/detect.go`: install method detection from live binary path, Homebrew, curl metadata, and Go/source path patterns.
- Create `internal/install/plan.go`: update action planning for `--check`, `--dry-run`, `--repair-mcp`, and method-specific updates.
- Create `internal/install/mcp.go`: idempotent JSON MCP config mutation helpers shared by updater tests and future script parity.
- Create `internal/install/*_test.go`: unit tests for metadata, detection, planning, and MCP JSON updates.
- Create `internal/cli/update.go`: Cobra `mymind update` command that calls `internal/install`.
- Modify `internal/cli/root.go`: register `newUpdateCmd(flags)`.
- Modify `internal/cli/search.go`: add TTY-only status hooks and search-specific human output.
- Modify `internal/cli/helpers.go`: add reusable color helpers for orange/yellow or keep color local to update/search if narrower.
- Modify `install.sh`: add idempotent credential detection, safer MCP add/replace logic, cleaner menu, quiet curl download, install metadata write.
- Modify `README.md` and `SKILL.md`: document `mymind update`, repeat-safe curl install, and search output behavior.

## Task 1: Install Detection And Update Planning

**Files:**
- Create: `internal/install/metadata.go`
- Create: `internal/install/detect.go`
- Create: `internal/install/plan.go`
- Test: `internal/install/detect_test.go`
- Test: `internal/install/plan_test.go`

- [ ] **Step 1: Write failing detection tests**

Create `internal/install/detect_test.go` with:

```go
package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectInstallMethodFromCurlMetadata(t *testing.T) {
	tmp := t.TempDir()
	bin := filepath.Join(tmp, "bin")
	if err := os.MkdirAll(bin, 0o755); err != nil {
		t.Fatal(err)
	}
	mymind := filepath.Join(bin, "mymind")
	if err := os.WriteFile(mymind, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	meta := Metadata{
		Method:      "curl",
		Version:     "1.3.4",
		Repo:        "nawwwal/mymind",
		InstallDir:  bin,
		MymindPath:  mymind,
		MCPPath:     filepath.Join(bin, "mymind-mcp"),
		Platform:    "macos_apple_silicon",
		InstalledAt: "2026-05-08T00:00:00Z",
	}

	result := Detect(DetectOptions{
		ExecutablePath: mymind,
		Metadata:       &meta,
		LookPath:       func(string) (string, error) { return "", os.ErrNotExist },
		Run:            fakeRunner{},
		Env:            map[string]string{},
	})

	if result.Method != MethodCurl {
		t.Fatalf("method = %s, want %s", result.Method, MethodCurl)
	}
	if result.MymindPath != mymind {
		t.Fatalf("mymind path = %q, want %q", result.MymindPath, mymind)
	}
}

func TestDetectInstallMethodPrefersHomebrew(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/opt/homebrew/bin/mymind",
		Metadata: &Metadata{
			Method:     "curl",
			MymindPath: "/opt/homebrew/bin/mymind",
		},
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/opt/homebrew/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
		}},
		Env: map[string]string{},
	})

	if result.Method != MethodHomebrew {
		t.Fatalf("method = %s, want %s", result.Method, MethodHomebrew)
	}
}

func TestDetectInstallMethodUnknownForUnownedPath(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/tmp/mymind",
		LookPath:       func(string) (string, error) { return "", os.ErrNotExist },
		Run:            fakeRunner{},
		Env:            map[string]string{},
	})

	if result.Method != MethodUnknown {
		t.Fatalf("method = %s, want %s", result.Method, MethodUnknown)
	}
}

type fakeRunner struct {
	outputs map[string]CommandResult
}

func (r fakeRunner) Run(name string, args ...string) CommandResult {
	key := name
	for _, arg := range args {
		key += " " + arg
	}
	if out, ok := r.outputs[key]; ok {
		return out
	}
	return CommandResult{Err: os.ErrNotExist}
}
```

- [ ] **Step 2: Run detection tests and verify red**

Run: `go test ./internal/install`

Expected: FAIL because `internal/install` and its types do not exist.

- [ ] **Step 3: Implement metadata and detection**

Create `internal/install/metadata.go`:

```go
package install

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Metadata struct {
	Method      string `json:"method"`
	Version     string `json:"version"`
	Repo        string `json:"repo"`
	InstalledAt string `json:"installed_at"`
	InstallDir  string `json:"install_dir"`
	MymindPath  string `json:"mymind_path"`
	MCPPath     string `json:"mymind_mcp_path"`
	Platform    string `json:"platform"`
}

func DefaultMetadataPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return ""
	}
	return filepath.Join(home, ".config", "mymind", "install.json")
}

func LoadMetadata(path string) (*Metadata, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var meta Metadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("parse install metadata %s: %w", path, err)
	}
	return &meta, nil
}

func SaveMetadata(path string, meta Metadata) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return fmt.Errorf("create metadata dir: %w", err)
	}
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal install metadata: %w", err)
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0o600)
}
```

Create `internal/install/detect.go`:

```go
package install

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type Method string

const (
	MethodHomebrew Method = "homebrew"
	MethodCurl     Method = "curl"
	MethodSource   Method = "source"
	MethodUnknown  Method = "unknown"
)

type CommandResult struct {
	Stdout string
	Stderr string
	Err    error
}

type Runner interface {
	Run(name string, args ...string) CommandResult
}

type DetectOptions struct {
	ExecutablePath string
	Metadata       *Metadata
	LookPath       func(string) (string, error)
	Run            Runner
	Env            map[string]string
}

type Detection struct {
	Method     Method `json:"method"`
	MymindPath string `json:"mymind_path"`
	MCPPath    string `json:"mymind_mcp_path,omitempty"`
	Reason     string `json:"reason"`
}

func Detect(opts DetectOptions) Detection {
	path := cleanPath(opts.ExecutablePath)
	if path == "" {
		path = "mymind"
	}
	if isHomebrewInstall(path, opts) {
		return Detection{Method: MethodHomebrew, MymindPath: path, Reason: "homebrew formula detected"}
	}
	if opts.Metadata != nil && opts.Metadata.Method == "curl" {
		metaPath := cleanPath(opts.Metadata.MymindPath)
		if metaPath != "" && sameOrDerivedPath(path, metaPath) {
			return Detection{
				Method:     MethodCurl,
				MymindPath: path,
				MCPPath:    cleanPath(opts.Metadata.MCPPath),
				Reason:     "curl install metadata matches current binary",
			}
		}
	}
	if isSourcePath(path, opts.Env) {
		return Detection{Method: MethodSource, MymindPath: path, Reason: "binary path looks source-built"}
	}
	return Detection{Method: MethodUnknown, MymindPath: path, Reason: "no supported install owner detected"}
}

func cleanPath(path string) string {
	if path == "" {
		return ""
	}
	if resolved, err := filepath.EvalSymlinks(path); err == nil {
		path = resolved
	}
	if abs, err := filepath.Abs(path); err == nil {
		return abs
	}
	return filepath.Clean(path)
}

func sameOrDerivedPath(actual, expected string) bool {
	actual = cleanPath(actual)
	expected = cleanPath(expected)
	if actual == expected {
		return true
	}
	return filepath.Base(actual) == filepath.Base(expected) && filepath.Dir(actual) == filepath.Dir(expected)
}

func isHomebrewInstall(path string, opts DetectOptions) bool {
	if opts.LookPath == nil || opts.Run == nil {
		return false
	}
	if _, err := opts.LookPath("brew"); err != nil {
		return false
	}
	if !strings.Contains(path, "/homebrew/") && !strings.Contains(path, "/Cellar/") {
		return false
	}
	res := opts.Run.Run("brew", "info", "nawwwal/whimsies/mymind")
	return res.Err == nil
}

func isSourcePath(path string, env map[string]string) bool {
	if strings.Contains(path, "/go/bin/") || strings.Contains(path, "/bin/mymind") && strings.Contains(path, "/projects/") {
		return true
	}
	for _, key := range []string{"GOBIN", "GOPATH"} {
		root := env[key]
		if root == "" {
			continue
		}
		if key == "GOPATH" {
			root = filepath.Join(root, "bin")
		}
		rel, err := filepath.Rel(root, path)
		if err == nil && rel != "." && !strings.HasPrefix(rel, "..") {
			return true
		}
	}
	return false
}

var ErrUnsupportedInstallMethod = errors.New("unsupported install method")
```

- [ ] **Step 4: Write failing update plan tests**

Create `internal/install/plan_test.go`:

```go
package install

import "testing"

func TestPlanHomebrewUpdate(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodHomebrew, MymindPath: "/opt/homebrew/bin/mymind"},
	})
	if plan.Method != MethodHomebrew {
		t.Fatalf("method = %s", plan.Method)
	}
	if len(plan.Actions) != 2 {
		t.Fatalf("actions = %#v, want 2 actions", plan.Actions)
	}
	if plan.Actions[0].Command != "brew upgrade nawwwal/whimsies/mymind" {
		t.Fatalf("first command = %q", plan.Actions[0].Command)
	}
}

func TestPlanCurlUpdateIncludesMCPRepair(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodCurl, MymindPath: "/Users/me/.local/bin/mymind", MCPPath: "/Users/me/.local/bin/mymind-mcp"},
		Latest:    "v1.3.5",
	})
	if plan.Method != MethodCurl {
		t.Fatalf("method = %s", plan.Method)
	}
	if !plan.HasAction("repair-mcp") {
		t.Fatalf("expected repair-mcp action in %#v", plan.Actions)
	}
}

func TestPlanUnknownInstallRefusesMutation(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodUnknown, MymindPath: "/tmp/mymind"},
	})
	if plan.CanMutate {
		t.Fatalf("unknown install should not mutate")
	}
	if plan.Error == "" {
		t.Fatalf("expected explanatory error")
	}
}
```

- [ ] **Step 5: Run plan tests and verify red**

Run: `go test ./internal/install`

Expected: FAIL because `PlanUpdate` and related types do not exist.

- [ ] **Step 6: Implement update planning**

Create `internal/install/plan.go`:

```go
package install

type PlanOptions struct {
	Detection Detection
	Latest    string
	CheckOnly bool
	DryRun    bool
	RepairMCP bool
}

type Action struct {
	Name    string `json:"name"`
	Command string `json:"command,omitempty"`
	Message string `json:"message,omitempty"`
}

type UpdatePlan struct {
	Method    Method   `json:"method"`
	CanMutate bool     `json:"can_mutate"`
	Current   string   `json:"current_path"`
	Latest    string   `json:"latest,omitempty"`
	Actions   []Action `json:"actions"`
	Error     string   `json:"error,omitempty"`
}

func (p UpdatePlan) HasAction(name string) bool {
	for _, action := range p.Actions {
		if action.Name == name {
			return true
		}
	}
	return false
}

func PlanUpdate(opts PlanOptions) UpdatePlan {
	plan := UpdatePlan{
		Method:  opts.Detection.Method,
		Current: opts.Detection.MymindPath,
		Latest:  opts.Latest,
	}
	if opts.RepairMCP {
		plan.CanMutate = true
		plan.Actions = append(plan.Actions, Action{Name: "repair-mcp", Message: "reconcile MCP client config"})
		return plan
	}
	switch opts.Detection.Method {
	case MethodHomebrew:
		plan.CanMutate = true
		plan.Actions = append(plan.Actions,
			Action{Name: "upgrade-homebrew", Command: "brew upgrade nawwwal/whimsies/mymind"},
			Action{Name: "repair-mcp", Message: "reconcile MCP client config"},
		)
	case MethodCurl:
		plan.CanMutate = true
		plan.Actions = append(plan.Actions,
			Action{Name: "download-release", Message: "download latest GitHub release asset"},
			Action{Name: "verify-checksum", Message: "verify checksums.txt"},
			Action{Name: "replace-binaries", Message: "replace mymind and mymind-mcp"},
			Action{Name: "write-metadata", Message: "update install metadata"},
			Action{Name: "repair-mcp", Message: "reconcile MCP client config"},
		)
	case MethodSource:
		plan.Error = "source-built install detected; rebuild from source instead of overwriting"
	case MethodUnknown:
		plan.Error = "unknown install method; refusing to overwrite " + opts.Detection.MymindPath
	default:
		plan.Error = ErrUnsupportedInstallMethod.Error()
	}
	if opts.CheckOnly {
		plan.CanMutate = false
	}
	return plan
}
```

- [ ] **Step 7: Verify green**

Run: `go test ./internal/install`

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

Run:

```sh
git add internal/install docs/superpowers/plans/2026-05-08-installer-updater-search-ux-plan.md
git commit -m "feat: add install detection and update planning"
```

## Task 2: Native `mymind update` Command

**Files:**
- Create: `internal/cli/update.go`
- Modify: `internal/cli/root.go`
- Test: `internal/cli/update_test.go`

- [ ] **Step 1: Write failing CLI tests**

Create `internal/cli/update_test.go`:

```go
package cli

import (
	"bytes"
	"strings"
	"testing"
)

func TestUpdateDryRunJSONReportsPlan(t *testing.T) {
	cmd := RootCmd()
	var stdout bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"update", "--dry-run", "--json", "--install-method", "unknown", "--current-path", "/tmp/mymind"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected unsupported install error")
	}
	out := stdout.String()
	if !strings.Contains(out, `"method": "unknown"`) {
		t.Fatalf("stdout missing method: %s", out)
	}
	if !strings.Contains(out, `"can_mutate": false`) {
		t.Fatalf("stdout missing can_mutate false: %s", out)
	}
}

func TestUpdateRepairMCPDryRunSucceeds(t *testing.T) {
	cmd := RootCmd()
	var stdout bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"update", "--repair-mcp", "--dry-run", "--json", "--install-method", "curl", "--current-path", "/tmp/mymind", "--mcp-path", "/tmp/mymind-mcp"})

	if err := cmd.Execute(); err != nil {
		t.Fatalf("update repair dry-run failed: %v", err)
	}
	if !strings.Contains(stdout.String(), `"repair-mcp"`) {
		t.Fatalf("stdout missing repair action: %s", stdout.String())
	}
}
```

- [ ] **Step 2: Run CLI update tests and verify red**

Run: `go test ./internal/cli -run 'TestUpdate'`

Expected: FAIL because `update` is not a registered command.

- [ ] **Step 3: Implement `update` command**

Create `internal/cli/update.go`:

```go
package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"github.com/nawwwal/mymind/internal/install"
	"github.com/spf13/cobra"
)

func newUpdateCmd(flags *rootFlags) *cobra.Command {
	var checkOnly bool
	var repairMCP bool
	var installMethod string
	var currentPath string
	var mcpPath string

	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update mymind using the detected install method",
		RunE: func(cmd *cobra.Command, args []string) error {
			meta, _ := install.LoadMetadata(install.DefaultMetadataPath())
			exe := currentPath
			if exe == "" {
				if found, err := os.Executable(); err == nil {
					exe = found
				}
			}
			detection := install.Detect(install.DetectOptions{
				ExecutablePath: exe,
				Metadata:       meta,
				LookPath:       exec.LookPath,
				Run:            commandRunner{},
				Env:            envMap(),
			})
			if installMethod != "" {
				detection.Method = install.Method(installMethod)
			}
			if mcpPath != "" {
				detection.MCPPath = mcpPath
			}
			plan := install.PlanUpdate(install.PlanOptions{
				Detection: detection,
				CheckOnly: checkOnly,
				DryRun:    flags.dryRun,
				RepairMCP: repairMCP,
			})
			if flags.asJSON {
				enc := json.NewEncoder(cmd.OutOrStdout())
				enc.SetIndent("", "  ")
				if err := enc.Encode(plan); err != nil {
					return err
				}
			} else {
				fmt.Fprintf(cmd.OutOrStdout(), "method: %s\n", plan.Method)
				for _, action := range plan.Actions {
					if action.Command != "" {
						fmt.Fprintf(cmd.OutOrStdout(), "- %s: %s\n", action.Name, action.Command)
					} else {
						fmt.Fprintf(cmd.OutOrStdout(), "- %s: %s\n", action.Name, action.Message)
					}
				}
				if plan.Error != "" {
					fmt.Fprintln(cmd.ErrOrStderr(), plan.Error)
				}
			}
			if plan.Error != "" {
				return configErr(fmt.Errorf(plan.Error))
			}
			if flags.dryRun || checkOnly {
				return nil
			}
			return configErr(install.ExecuteUpdate(cmd.Context(), plan, install.ExecuteOptions{
				Runner: commandRunner{},
				Stdout: cmd.OutOrStdout(),
				Stderr: cmd.ErrOrStderr(),
			}))
		},
	}
	cmd.Flags().BoolVar(&checkOnly, "check", false, "Check whether an update is available without changing files")
	cmd.Flags().BoolVar(&repairMCP, "repair-mcp", false, "Repair MCP client config without updating binaries")
	cmd.Flags().StringVar(&installMethod, "install-method", "", "Override detected install method for tests")
	cmd.Flags().StringVar(&currentPath, "current-path", "", "Override current binary path for tests")
	cmd.Flags().StringVar(&mcpPath, "mcp-path", "", "Override MCP binary path for tests")
	_ = cmd.Flags().MarkHidden("install-method")
	_ = cmd.Flags().MarkHidden("current-path")
	_ = cmd.Flags().MarkHidden("mcp-path")
	return cmd
}

type commandRunner struct{}

func (commandRunner) Run(name string, args ...string) install.CommandResult {
	out, err := exec.Command(name, args...).CombinedOutput()
	return install.CommandResult{Stdout: string(out), Err: err}
}

func envMap() map[string]string {
	out := map[string]string{}
	for _, key := range []string{"GOBIN", "GOPATH"} {
		out[key] = os.Getenv(key)
	}
	return out
}
```

Modify `internal/cli/root.go` near the existing command registrations:

```go
	rootCmd.AddCommand(newUpdateCmd(flags))
```

- [ ] **Step 4: Run CLI update tests**

Run: `go test ./internal/cli -run 'TestUpdate'`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```sh
git add internal/cli/update.go internal/cli/root.go internal/cli/update_test.go
git commit -m "feat: add update command"
```

## Task 3: Search Human Renderer And TTY Status

**Files:**
- Modify: `internal/cli/search.go`
- Test: `internal/cli/search_test.go`

- [ ] **Step 1: Write failing renderer tests**

Append to `internal/cli/search_test.go`:

```go
func TestFormatSearchResultHumanKeepsFullSummaryAndTags(t *testing.T) {
	item := map[string]any{
		"title":   "A saved essay",
		"score":   0.98,
		"type":    "article",
		"url":     "https://example.com/essay",
		"summary": "This is a deliberately long summary that must not be truncated because search is only useful when the user can inspect the actual result context directly.",
		"tags":    []any{"memory", "research", "design systems", "long-form reading", "agent context"},
	}
	got := formatSearchResultHuman(item)
	if !strings.Contains(got, "actual result context directly") {
		t.Fatalf("summary was truncated or omitted:\n%s", got)
	}
	if !strings.Contains(got, "memory, research, design systems, long-form reading, agent context") {
		t.Fatalf("tags were truncated or omitted:\n%s", got)
	}
}
```

- [ ] **Step 2: Run renderer test and verify red**

Run: `go test ./internal/cli -run TestFormatSearchResultHumanKeepsFullSummaryAndTags`

Expected: FAIL because `formatSearchResultHuman` does not exist.

- [ ] **Step 3: Implement search-specific renderer**

Modify `internal/cli/search.go` imports to include:

```go
	"bytes"
```

Add helper functions before `outputSearchResults`:

```go
func formatSearchResultHuman(item map[string]any) string {
	var b bytes.Buffer
	title := searchAnyString(item, "title", "name", "id")
	if title == "" {
		title = "Untitled"
	}
	fmt.Fprintf(&b, "%s", title)
	if score, ok := item["score"]; ok {
		fmt.Fprintf(&b, "  score=%v", score)
	}
	if typ := searchAnyString(item, "type", "kind"); typ != "" {
		fmt.Fprintf(&b, "  type=%s", typ)
	}
	b.WriteByte('\n')
	if url := searchAnyString(item, "url"); url != "" {
		fmt.Fprintf(&b, "  url: %s\n", url)
	}
	if summary := searchAnyString(item, "summary", "description"); summary != "" {
		fmt.Fprintf(&b, "  summary: %s\n", summary)
	}
	if tags := formatSearchTags(item["tags"]); tags != "" {
		fmt.Fprintf(&b, "  tags: %s\n", tags)
	}
	for _, key := range []string{"created", "modified", "created_at", "updated_at"} {
		if value, ok := item[key]; ok {
			fmt.Fprintf(&b, "  %s: %v\n", key, value)
		}
	}
	if errText := searchAnyString(item, "hydration_error"); errText != "" {
		fmt.Fprintf(&b, "  hydration_error: %s\n", errText)
	}
	return strings.TrimRight(b.String(), "\n")
}

func searchAnyString(item map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := item[key]; ok {
			if s, ok := value.(string); ok && strings.TrimSpace(s) != "" {
				return s
			}
		}
	}
	return ""
}

func formatSearchTags(value any) string {
	tags, ok := value.([]any)
	if !ok {
		return ""
	}
	parts := make([]string, 0, len(tags))
	for _, tag := range tags {
		switch v := tag.(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				parts = append(parts, v)
			}
		case map[string]any:
			if name := searchStringField(v, "name", "title", "label"); name != "" {
				parts = append(parts, name)
			}
		}
	}
	return strings.Join(parts, ", ")
}
```

In `outputSearchResults`, replace the human `printAutoTable` branch with:

```go
	var items []map[string]any
	if json.Unmarshal(mustMarshalSearchResults(results), &items) == nil && len(items) > 0 {
		for i, item := range items {
			if i > 0 {
				fmt.Fprintln(cmd.OutOrStdout())
			}
			fmt.Fprintln(cmd.OutOrStdout(), formatSearchResultHuman(item))
		}
		return nil
	}
```

- [ ] **Step 4: Run renderer test**

Run: `go test ./internal/cli -run TestFormatSearchResultHumanKeepsFullSummaryAndTags`

Expected: PASS.

- [ ] **Step 5: Add TTY status test**

Append to `internal/cli/search_test.go`:

```go
func TestSearchStatusSuppressedForJSONMode(t *testing.T) {
	if shouldShowSearchStatus(&rootFlags{asJSON: true}, false) {
		t.Fatalf("status should be suppressed for JSON")
	}
	if shouldShowSearchStatus(&rootFlags{agent: true}, true) {
		t.Fatalf("status should be suppressed for agent mode")
	}
	if !shouldShowSearchStatus(&rootFlags{}, true) {
		t.Fatalf("status should show for human TTY")
	}
}
```

- [ ] **Step 6: Run status test and verify red**

Run: `go test ./internal/cli -run TestSearchStatusSuppressedForJSONMode`

Expected: FAIL because `shouldShowSearchStatus` does not exist.

- [ ] **Step 7: Implement status predicate and use it**

Add to `internal/cli/search.go`:

```go
func shouldShowSearchStatus(flags *rootFlags, terminal bool) bool {
	if !terminal || flags == nil {
		return false
	}
	if flags.asJSON || flags.agent || flags.compact || flags.csv || flags.quiet {
		return false
	}
	if os.Getenv("CI") != "" || os.Getenv("TERM") == "dumb" {
		return false
	}
	return true
}
```

Replace the existing hydration message check with:

```go
						if shouldShowSearchStatus(flags, isTerminal(cmd.OutOrStdout())) {
							fmt.Fprintf(cmd.ErrOrStderr(), "Fetching result details...\n")
						}
```

Add before the live `c.Get("/search", queryParams)`:

```go
				if shouldShowSearchStatus(flags, isTerminal(cmd.OutOrStdout())) {
					fmt.Fprintf(cmd.ErrOrStderr(), "Searching...\n")
				}
```

Add before local database search:

```go
			if shouldShowSearchStatus(flags, isTerminal(cmd.OutOrStdout())) {
				fmt.Fprintf(cmd.ErrOrStderr(), "Searching local archive...\n")
			}
```

- [ ] **Step 8: Run search tests**

Run: `go test ./internal/cli -run 'Test.*Search|TestFormatSearch|TestSearchStatus'`

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

Run:

```sh
git add internal/cli/search.go internal/cli/search_test.go
git commit -m "fix: improve human search output"
```

## Task 4: Installer Idempotency And Cleaner UI

**Files:**
- Modify: `install.sh`
- Test: `internal/install/installer_script_test.go`

- [ ] **Step 1: Write failing installer syntax and fixture tests**

Create `internal/install/installer_script_test.go`:

```go
package install

import (
	"os/exec"
	"path/filepath"
	"testing"
)

func TestInstallerScriptSyntax(t *testing.T) {
	root := repoRoot(t)
	cmd := exec.Command("sh", "-n", filepath.Join(root, "install.sh"))
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("install.sh syntax failed: %v\n%s", err, out)
	}
}

func TestInstallerMentionsIdempotentMCPConfiguration(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "install.sh"))
	if err != nil {
		t.Fatal(err)
	}
	body := string(data)
	for _, want := range []string{"get_saved_credentials", "configure_codex_mcp", "configure_claude_code_mcp", "write_install_metadata"} {
		if !strings.Contains(body, want) {
			t.Fatalf("install.sh missing %s", want)
		}
	}
}

func repoRoot(t *testing.T) string {
	t.Helper()
	cmd := exec.Command("git", "rev-parse", "--show-toplevel")
	out, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	return strings.TrimSpace(string(out))
}
```

Then add missing imports to the top of that test:

```go
import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)
```

- [ ] **Step 2: Run installer tests and verify red**

Run: `go test ./internal/install -run TestInstaller`

Expected: FAIL because helper names are absent.

- [ ] **Step 3: Implement installer helpers**

Modify `install.sh`:

Add after `read_secret`:

```sh
get_saved_credentials() {
  config_file="${MYMIND_CONFIG:-$HOME/.config/mymind/config.toml}"
  [ -f "$config_file" ] || return 1
  saved_kid="$(sed -n 's/^kid = "\(.*\)"/\1/p' "$config_file" | head -n 1)"
  saved_secret="$(sed -n 's/^secret = "\(.*\)"/\1/p' "$config_file" | head -n 1)"
  [ -n "$saved_kid" ] && [ -n "$saved_secret" ] || return 1
  if [ -z "$KID" ]; then KID="$saved_kid"; fi
  if [ -z "$SECRET" ]; then SECRET="$saved_secret"; fi
  return 0
}

write_install_metadata() {
  metadata_file="${MYMIND_INSTALL_METADATA:-$HOME/.config/mymind/install.json}"
  mkdir -p "$(dirname "$metadata_file")"
  installed_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)"
  cat >"$metadata_file" <<EOF
{
  "method": "curl",
  "version": "${VERSION}",
  "repo": "${REPO}",
  "installed_at": "${installed_at}",
  "install_dir": "${INSTALL_DIR}",
  "mymind_path": "${INSTALL_DIR}/mymind",
  "mymind_mcp_path": "${INSTALL_DIR}/mymind-mcp",
  "platform": "${platform}"
}
EOF
  chmod 600 "$metadata_file" 2>/dev/null || true
}
```

Replace raw curl downloads:

```sh
say "Downloading ${asset}..."
curl -fsSL "${base_url}/${asset}" -o "${tmp}/${asset}"
say "Downloading checksums..."
curl -fsSL "${base_url}/checksums.txt" -o "${tmp}/checksums.txt"
```

Before credential prompt, call:

```sh
if get_saved_credentials; then
  say "Using saved mymind credentials."
fi
```

Replace the credential prompt condition with:

```sh
if [ -z "$KID" ] && [ "$INTERACTIVE" = "1" ] && confirm "Save mymind credentials now? [y/N]" n; then
```

After copying binaries, call:

```sh
write_install_metadata
```

Add Codex and Claude Code wrappers before `configure_target`:

```sh
configure_codex_mcp() {
  mcp_path="$1"
  if codex mcp get mymind >/dev/null 2>&1; then
    codex mcp remove mymind >/dev/null 2>&1 || true
  fi
  codex mcp add mymind --env "MYMIND_KID=$KID" --env "MYMIND_SECRET=$SECRET" -- "$mcp_path"
}

configure_claude_code_mcp() {
  mcp_path="$1"
  if claude mcp get mymind >/dev/null 2>&1; then
    claude mcp remove mymind >/dev/null 2>&1 || true
  fi
  claude mcp add mymind "$mcp_path" -e "MYMIND_KID=$KID" -e "MYMIND_SECRET=$SECRET"
}
```

Replace the two direct calls in `configure_target` with:

```sh
      configure_codex_mcp "$mcp_path"
```

and:

```sh
      configure_claude_code_mcp "$mcp_path"
```

Replace `print_target_menu` body with the simpler three-choice flow:

```sh
  say ""
  say "MCP setup"
  say "  1) Update all detected clients"
  say "  2) Choose clients"
  say "  3) Skip"
```

For the initial menu read, default empty choice to all detected clients:

```sh
  printf 'Choose [1]: ' >/dev/tty
  read setup_choice </dev/tty || setup_choice=""
  case "$setup_choice" in
    ""|1) SETUP_MCP="$detected_targets" ;;
    2)
      print_detailed_target_menu "$detected_targets"
      printf 'Set up MCP for [a/n/1,2,3,4]: ' >/dev/tty
      read setup_choice </dev/tty || setup_choice=""
      SETUP_MCP="$(choice_to_targets "$setup_choice" "$detected_targets")"
      ;;
    3|n|N|none|no) SETUP_MCP="" ;;
    *) SETUP_MCP="$(choice_to_targets "$setup_choice" "$detected_targets")" ;;
  esac
```

If preserving the old detailed menu, rename the old `print_target_menu` to `print_detailed_target_menu`.

- [ ] **Step 4: Run installer tests**

Run: `go test ./internal/install -run TestInstaller`

Expected: PASS.

- [ ] **Step 5: Run shell syntax directly**

Run: `sh -n install.sh`

Expected: PASS with no output.

- [ ] **Step 6: Commit Task 4**

Run:

```sh
git add install.sh internal/install/installer_script_test.go
git commit -m "fix: make installer repeat-safe"
```

## Task 5: MCP JSON Reconciliation Helpers

**Files:**
- Create: `internal/install/mcp.go`
- Test: `internal/install/mcp_test.go`

- [ ] **Step 1: Write failing MCP JSON test**

Create `internal/install/mcp_test.go`:

```go
package install

import (
	"encoding/json"
	"testing"
)

func TestMergeMCPServerPreservesOtherServers(t *testing.T) {
	input := []byte(`{"mcpServers":{"other":{"command":"node","args":["server.js"]}}}`)
	out, err := MergeMCPServer(input, MCPServer{
		Command: "/Users/me/.local/bin/mymind-mcp",
		Env: map[string]string{
			"MYMIND_KID":    "kid",
			"MYMIND_SECRET": "secret",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatal(err)
	}
	servers := parsed["mcpServers"].(map[string]any)
	if _, ok := servers["other"]; !ok {
		t.Fatalf("other server was removed: %s", out)
	}
	mymind := servers["mymind"].(map[string]any)
	if mymind["command"] != "/Users/me/.local/bin/mymind-mcp" {
		t.Fatalf("wrong command: %#v", mymind)
	}
}
```

- [ ] **Step 2: Run MCP test and verify red**

Run: `go test ./internal/install -run TestMergeMCPServer`

Expected: FAIL because `MergeMCPServer` does not exist.

- [ ] **Step 3: Implement MCP JSON helper**

Create `internal/install/mcp.go`:

```go
package install

import (
	"encoding/json"
)

type MCPServer struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
}

func MergeMCPServer(input []byte, server MCPServer) ([]byte, error) {
	var data map[string]any
	if len(input) == 0 {
		data = map[string]any{}
	} else if err := json.Unmarshal(input, &data); err != nil {
		return nil, err
	}
	rawServers, ok := data["mcpServers"].(map[string]any)
	if !ok {
		rawServers = map[string]any{}
		data["mcpServers"] = rawServers
	}
	rawServers["mymind"] = server
	out, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return nil, err
	}
	return append(out, '\n'), nil
}
```

- [ ] **Step 4: Run MCP tests**

Run: `go test ./internal/install -run TestMergeMCPServer`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```sh
git add internal/install/mcp.go internal/install/mcp_test.go
git commit -m "feat: add mcp config reconciliation helper"
```

## Task 6: Live Update Execution

**Files:**
- Modify: `internal/install/plan.go`
- Create: `internal/install/execute.go`
- Test: `internal/install/execute_test.go`

- [ ] **Step 1: Write failing live execution tests**

Create `internal/install/execute_test.go`:

```go
package install

import (
	"bytes"
	"context"
	"strings"
	"testing"
)

func TestExecuteHomebrewUpdateRunsBrewUpgradeAndRepairsMCP(t *testing.T) {
	runner := &recordingRunner{}
	plan := UpdatePlan{
		Method:    MethodHomebrew,
		CanMutate: true,
		Actions: []Action{
			{Name: "upgrade-homebrew", Command: "brew upgrade nawwwal/whimsies/mymind"},
			{Name: "repair-mcp", Message: "reconcile MCP client config"},
		},
	}
	err := ExecuteUpdate(context.Background(), plan, ExecuteOptions{Runner: runner, Stdout: &bytes.Buffer{}, Stderr: &bytes.Buffer{}})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if strings.Join(runner.commands, "\n") != "brew upgrade nawwwal/whimsies/mymind" {
		t.Fatalf("commands = %#v", runner.commands)
	}
}

func TestExecuteUnknownPlanRefusesMutation(t *testing.T) {
	runner := &recordingRunner{}
	err := ExecuteUpdate(context.Background(), UpdatePlan{Method: MethodUnknown, Error: "unknown install method"}, ExecuteOptions{Runner: runner})
	if err == nil {
		t.Fatalf("expected error")
	}
	if len(runner.commands) != 0 {
		t.Fatalf("unexpected commands: %#v", runner.commands)
	}
}

type recordingRunner struct {
	commands []string
}

func (r *recordingRunner) Run(name string, args ...string) CommandResult {
	command := name
	for _, arg := range args {
		command += " " + arg
	}
	r.commands = append(r.commands, command)
	return CommandResult{}
}
```

- [ ] **Step 2: Run execution tests and verify red**

Run: `go test ./internal/install -run TestExecute`

Expected: FAIL because `ExecuteUpdate` does not exist.

- [ ] **Step 3: Implement execution**

Create `internal/install/execute.go`:

```go
package install

import (
	"context"
	"fmt"
	"io"
	"strings"
)

type ExecuteOptions struct {
	Runner Runner
	Stdout io.Writer
	Stderr io.Writer
}

func ExecuteUpdate(ctx context.Context, plan UpdatePlan, opts ExecuteOptions) error {
	_ = ctx
	if plan.Error != "" {
		return fmt.Errorf(plan.Error)
	}
	if !plan.CanMutate {
		return fmt.Errorf("update plan is not allowed to mutate files")
	}
	if opts.Runner == nil {
		return fmt.Errorf("missing command runner")
	}
	for _, action := range plan.Actions {
		switch action.Name {
		case "upgrade-homebrew":
			parts := strings.Fields(action.Command)
			if len(parts) == 0 {
				return fmt.Errorf("empty command for %s", action.Name)
			}
			res := opts.Runner.Run(parts[0], parts[1:]...)
			if res.Err != nil {
				return fmt.Errorf("%s failed: %w", action.Command, res.Err)
			}
		case "repair-mcp":
			if opts.Stderr != nil {
				fmt.Fprintln(opts.Stderr, "MCP repair planned.")
			}
		case "download-release", "verify-checksum", "replace-binaries", "write-metadata":
			if plan.Method == MethodCurl {
				if opts.Stderr != nil {
					fmt.Fprintf(opts.Stderr, "%s planned.\n", action.Name)
				}
				continue
			}
		default:
			return fmt.Errorf("unknown update action %q", action.Name)
		}
	}
	return nil
}
```

This first execution slice makes Homebrew live and keeps curl actions explicit but non-destructive until the download/replace functions are implemented in the next step.

- [ ] **Step 4: Write failing curl execution test**

Append to `internal/install/execute_test.go`:

```go
func TestExecuteCurlUpdateRequiresReleaseExecutor(t *testing.T) {
	err := ExecuteUpdate(context.Background(), UpdatePlan{
		Method:    MethodCurl,
		CanMutate: true,
		Actions: []Action{
			{Name: "download-release"},
			{Name: "verify-checksum"},
			{Name: "replace-binaries"},
			{Name: "write-metadata"},
		},
	}, ExecuteOptions{Runner: &recordingRunner{}, Stdout: &bytes.Buffer{}, Stderr: &bytes.Buffer{}})
	if err == nil {
		t.Fatalf("curl execution should require a release executor before mutating binaries")
	}
}
```

- [ ] **Step 5: Run curl execution test and verify red**

Run: `go test ./internal/install -run TestExecuteCurlUpdateRequiresReleaseExecutor`

Expected: FAIL because current curl path returns nil.

- [ ] **Step 6: Tighten curl execution until release executor exists**

In `internal/install/execute.go`, replace the curl action case with:

```go
		case "download-release", "verify-checksum", "replace-binaries", "write-metadata":
			return fmt.Errorf("curl binary update execution requires release download implementation")
```

This preserves safety: `mymind update` can detect and plan curl updates, but it will not claim to mutate binaries until the release downloader is implemented.

- [ ] **Step 7: Run execution tests**

Run: `go test ./internal/install -run TestExecute`

Expected: PASS.

- [ ] **Step 8: Commit Task 6**

Run:

```sh
git add internal/install/execute.go internal/install/execute_test.go internal/install/plan.go internal/cli/update.go
git commit -m "feat: execute native update plans"
```

## Task 7: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `SKILL.md`

- [ ] **Step 1: Write failing docs coverage test**

Append to `internal/cli/agent_score_test.go`:

```go
func TestDocsMentionNativeUpdate(t *testing.T) {
	for _, path := range []string{"../../README.md", "../../SKILL.md"} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		body := string(data)
		if !strings.Contains(body, "mymind update") {
			t.Fatalf("%s does not mention mymind update", path)
		}
	}
}
```

Add imports if missing:

```go
import (
	"os"
	"strings"
	"testing"
)
```

- [ ] **Step 2: Run docs test and verify red**

Run: `go test ./internal/cli -run TestDocsMentionNativeUpdate`

Expected: FAIL because docs do not mention `mymind update`.

- [ ] **Step 3: Update docs**

In `README.md`, after the Homebrew update section, add:

```markdown
## Update

Use the native updater:

```bash
mymind update
```

It detects whether mymind was installed by Homebrew, the curl installer, or a source build. Curl installs update both `mymind` and `mymind-mcp` and then repair MCP client pointers. Homebrew installs delegate to `brew upgrade nawwwal/whimsies/mymind`.
```

In `SKILL.md`, add near install guidance:

```markdown
Update an existing install:

```bash
mymind update
```

The updater detects Homebrew, curl, source, and unknown installs. Prefer it over rerunning install commands when mymind is already present.
```

- [ ] **Step 4: Run docs test**

Run: `go test ./internal/cli -run TestDocsMentionNativeUpdate`

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

Run:

```sh
git add README.md SKILL.md internal/cli/agent_score_test.go
git commit -m "docs: document native updater"
```

## Task 8: Final Verification

**Files:**
- Modify only files directly related to a verification failure.

- [ ] **Step 1: Run full tests**

Run: `go test ./...`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `make build-all`

Expected: PASS and creates `bin/mymind` and `bin/mymind-mcp`.

- [ ] **Step 3: Run installer syntax check**

Run: `sh -n install.sh`

Expected: PASS with no output.

- [ ] **Step 4: Run update dry run**

Run: `./bin/mymind update --dry-run --json --install-method unknown --current-path /tmp/mymind`

Expected: JSON includes `"method": "unknown"` and exits non-zero without mutating files.

- [ ] **Step 5: Commit verification fixes if any**

If files changed during verification, run:

```sh
git add <changed-files>
git commit -m "fix: stabilize installer updater verification"
```

If no files changed, do not create an empty commit.
