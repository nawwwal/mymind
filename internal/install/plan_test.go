package install

import "testing"

func TestPlanHomebrewUpdate(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodHomebrew, MymindPath: "/opt/homebrew/bin/mymind"},
	})
	if plan.Method != MethodHomebrew {
		t.Fatalf("method = %s", plan.Method)
	}
	if len(plan.Actions) != 1 {
		t.Fatalf("actions = %#v, want 1 action", plan.Actions)
	}
	if plan.Actions[0].Command != "brew upgrade nawwwal/whimsies/mymind" {
		t.Fatalf("first command = %q", plan.Actions[0].Command)
	}
}

func TestPlanHomebrewDryRunListsActionsWithoutMutation(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodHomebrew, MymindPath: "/opt/homebrew/bin/mymind"},
		DryRun:    true,
	})
	if plan.CanMutate {
		t.Fatalf("dry-run homebrew plan should not mutate")
	}
	if !plan.HasAction("upgrade-homebrew") {
		t.Fatalf("dry-run should still list intended actions: %#v", plan.Actions)
	}
	if plan.HasAction("repair-mcp") {
		t.Fatalf("dry-run should not advertise unsupported repair execution: %#v", plan.Actions)
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
	if !plan.HasAction("replace-binaries") {
		t.Fatalf("expected replace-binaries action in %#v", plan.Actions)
	}
	if plan.HasAction("repair-mcp") {
		t.Fatalf("curl binary update should not advertise unsupported MCP repair: %#v", plan.Actions)
	}
	if !plan.CanMutate {
		t.Fatalf("live curl plan should mutate through the repeat-safe installer: %#v", plan)
	}
	if plan.Error != "" {
		t.Fatalf("unexpected curl plan error: %s", plan.Error)
	}
}

func TestPlanCurlDryRunListsActionsWithoutMutation(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodCurl, MymindPath: "/Users/me/.local/bin/mymind", MCPPath: "/Users/me/.local/bin/mymind-mcp"},
		DryRun:    true,
	})
	if plan.CanMutate {
		t.Fatalf("dry-run curl plan should not mutate")
	}
	if !plan.HasAction("replace-binaries") {
		t.Fatalf("dry-run should still list intended actions: %#v", plan.Actions)
	}
	if plan.HasAction("repair-mcp") {
		t.Fatalf("dry-run should not advertise unsupported repair execution: %#v", plan.Actions)
	}
}

func TestPlanRepairMCPCheckOnlyListsActionWithoutMutation(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodUnknown, MymindPath: "/tmp/mymind"},
		RepairMCP: true,
		CheckOnly: true,
	})
	if plan.CanMutate {
		t.Fatalf("repair-mcp check-only plan should not mutate")
	}
	if !plan.HasAction("repair-mcp") {
		t.Fatalf("expected repair-mcp action in %#v", plan.Actions)
	}
}

func TestPlanRepairMCPDryRunListsActionWithoutMutation(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodUnknown, MymindPath: "/tmp/mymind"},
		RepairMCP: true,
		DryRun:    true,
	})
	if plan.CanMutate {
		t.Fatalf("repair-mcp dry-run plan should not mutate")
	}
	if !plan.HasAction("repair-mcp") {
		t.Fatalf("expected repair-mcp action in %#v", plan.Actions)
	}
}

func TestPlanRepairMCPLiveFailsClosed(t *testing.T) {
	plan := PlanUpdate(PlanOptions{
		Detection: Detection{Method: MethodHomebrew, MymindPath: "/opt/homebrew/bin/mymind"},
		RepairMCP: true,
	})
	if plan.CanMutate {
		t.Fatalf("live repair-mcp plan should not mutate until repair execution exists: %#v", plan)
	}
	if !plan.HasAction("repair-mcp") {
		t.Fatalf("expected repair-mcp action in %#v", plan.Actions)
	}
	if plan.Error == "" {
		t.Fatalf("expected live repair-mcp plan to fail closed")
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
	if plan.Error != "unknown install method; refusing to overwrite /tmp/mymind" {
		t.Fatalf("error = %q", plan.Error)
	}
}
