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
