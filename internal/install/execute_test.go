package install

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestExecuteHomebrewUpdateRunsBrewUpgrade(t *testing.T) {
	runner := &recordingRunner{}
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodHomebrew, MymindPath: "/opt/homebrew/bin/mymind"},
	})

	if err := ExecuteUpdate(context.Background(), plan, ExecuteOptions{Runner: runner}); err != nil {
		t.Fatalf("execute update: %v", err)
	}

	if len(runner.calls) != 1 {
		t.Fatalf("commands run = %#v, want one brew upgrade", runner.calls)
	}
	if runner.calls[0] != "brew upgrade nawwwal/whimsies/mymind" {
		t.Fatalf("command = %q, want brew upgrade", runner.calls[0])
	}
}

func TestExecuteUnknownPlanRefusesMutation(t *testing.T) {
	runner := &recordingRunner{}
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodUnknown, MymindPath: "/tmp/mymind"},
	})

	err := ExecuteUpdate(context.Background(), plan, ExecuteOptions{Runner: runner})
	if err == nil {
		t.Fatalf("expected unknown plan refusal")
	}
	if !strings.Contains(err.Error(), "unknown install method") {
		t.Fatalf("error = %q", err.Error())
	}
	if len(runner.calls) != 0 {
		t.Fatalf("commands run = %#v, want none", runner.calls)
	}
}

func TestExecuteCurlUpdateFailsClosedUntilReleaseExecutorExists(t *testing.T) {
	runner := &recordingRunner{}
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodCurl, MymindPath: "/tmp/mymind", MCPPath: "/tmp/mymind-mcp"},
	})

	err := ExecuteUpdate(context.Background(), plan, ExecuteOptions{Runner: runner})
	if err == nil {
		t.Fatalf("expected curl update to fail closed")
	}
	if !strings.Contains(err.Error(), "curl update execution requires release downloader/replacer") {
		t.Fatalf("error = %q", err.Error())
	}
	if len(runner.calls) != 0 {
		t.Fatalf("commands run = %#v, want none", runner.calls)
	}
}

type recordingRunner struct {
	calls []string
	err   error
}

func (r *recordingRunner) Run(name string, args ...string) CommandResult {
	call := name
	for _, arg := range args {
		call += " " + arg
	}
	r.calls = append(r.calls, call)
	if r.err != nil {
		return CommandResult{Err: r.err}
	}
	if name == "brew" {
		return CommandResult{}
	}
	return CommandResult{Err: errors.New("unexpected command")}
}
