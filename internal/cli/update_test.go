package cli

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/nawwwal/mymind/internal/install"
)

func TestUpdateDryRunJSONReportsPlanAndFailsForUnknownMethod(t *testing.T) {
	cmd := RootCmd()
	var stdout bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"update", "--dry-run", "--json", "--install-method", "unknown", "--current-path", "/tmp/mymind"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected unknown install method error")
	}

	var plan install.UpdatePlan
	if decodeErr := json.Unmarshal(stdout.Bytes(), &plan); decodeErr != nil {
		t.Fatalf("stdout is not an update plan: %v\n%s", decodeErr, stdout.String())
	}
	if plan.Method != install.MethodUnknown {
		t.Fatalf("method = %s, want %s", plan.Method, install.MethodUnknown)
	}
	if plan.CanMutate {
		t.Fatalf("dry-run plan should not mutate: %#v", plan)
	}
	if plan.Error == "" {
		t.Fatalf("expected explanatory plan error: %#v", plan)
	}
}

func TestUpdateCheckJSONReportsPlan(t *testing.T) {
	cmd := RootCmd()
	var stdout bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"update", "--check", "--json", "--install-method", "homebrew", "--current-path", "/opt/homebrew/bin/mymind"})

	if err := cmd.Execute(); err != nil {
		t.Fatalf("update check failed: %v", err)
	}

	var plan install.UpdatePlan
	if err := json.Unmarshal(stdout.Bytes(), &plan); err != nil {
		t.Fatalf("stdout is not an update plan: %v\n%s", err, stdout.String())
	}
	if plan.Method != install.MethodHomebrew {
		t.Fatalf("method = %s, want %s", plan.Method, install.MethodHomebrew)
	}
	if plan.CanMutate {
		t.Fatalf("check plan should not mutate: %#v", plan)
	}
	if !plan.HasAction("upgrade-homebrew") {
		t.Fatalf("check plan missing homebrew action: %#v", plan.Actions)
	}
}

func TestUpdateRepairMCPDryRunJSONSucceedsWithCurlOverride(t *testing.T) {
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

func TestUpdateRejectsPositionalArgs(t *testing.T) {
	cmd := RootCmd()
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"update", "garbage", "--check"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected positional arg error")
	}
	if !strings.Contains(err.Error(), `unknown command "garbage"`) && !strings.Contains(err.Error(), "accepts 0 arg") {
		t.Fatalf("error = %q", err.Error())
	}
}

func TestUpdateOverrideFlagsAreNotAcceptedByOtherCommands(t *testing.T) {
	cmd := RootCmd()
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"objects", "--install-method", "curl", "--help"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected update-only override flag to be rejected by objects")
	}
	if !strings.Contains(err.Error(), "unknown flag: --install-method") {
		t.Fatalf("error = %q", err.Error())
	}
}

func TestAgentContextDoesNotIncludeUpdateTestOverrideFlags(t *testing.T) {
	ctx := buildAgentContext(RootCmd())
	data, err := json.Marshal(ctx)
	if err != nil {
		t.Fatalf("marshal agent context: %v", err)
	}
	out := string(data)
	for _, flagName := range []string{"install-method", "current-path", "mcp-path"} {
		if strings.Contains(out, flagName) {
			t.Fatalf("agent context leaked hidden update flag %q in %s", flagName, out)
		}
	}
}

func TestUpdateLiveMutationReturnsClearTaskSixError(t *testing.T) {
	cmd := RootCmd()
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&stderr)
	cmd.SetArgs([]string{"update", "--install-method", "curl", "--current-path", "/tmp/mymind", "--mcp-path", "/tmp/mymind-mcp"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected live execution error")
	}
	if !strings.Contains(err.Error(), "live update execution is not implemented yet") {
		t.Fatalf("error = %q", err.Error())
	}
}
