package install

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

type ExecuteOptions struct {
	Runner Runner
}

func ExecuteUpdate(ctx context.Context, plan UpdatePlan, opts ExecuteOptions) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if plan.Error != "" {
		return errors.New(plan.Error)
	}
	if !plan.CanMutate {
		return nil
	}
	if opts.Runner == nil {
		return errors.New("update execution requires a command runner")
	}
	if plan.Method == MethodCurl {
		return executeCurlUpdate(ctx, plan, opts.Runner)
	}

	for _, action := range plan.Actions {
		if err := ctx.Err(); err != nil {
			return err
		}
		switch action.Name {
		case "upgrade-homebrew":
			if err := executeHomebrewUpdate(ctx, opts.Runner); err != nil {
				return err
			}
		case "repair-mcp":
			return errors.New(mcpRepairUnsupported)
		case "download-release", "verify-checksum", "replace-binaries", "write-metadata":
			return fmt.Errorf("curl update action %q reached generic executor", action.Name)
		default:
			return fmt.Errorf("unsupported update action %q", action.Name)
		}
	}
	return nil
}

func executeCurlUpdate(ctx context.Context, plan UpdatePlan, runner Runner) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	current := cleanPath(plan.Current)
	if current == "" {
		return errors.New("curl update requires current mymind path")
	}
	installDir := filepath.Dir(current)
	if installDir == "." || installDir == "" {
		return fmt.Errorf("curl update cannot determine install directory from %q", plan.Current)
	}

	scriptURL := "https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh"
	command := "curl -fsSL " + shellQuote(scriptURL) +
		" | MYMIND_INSTALL_DIR=" + shellQuote(installDir) +
		" MYMIND_SETUP_MCP=none MYMIND_YES=1 sh"
	result := runner.Run("sh", "-c", command)
	if result.Err != nil {
		detail := strings.TrimSpace(result.Stderr)
		if detail == "" {
			detail = strings.TrimSpace(result.Stdout)
		}
		if detail != "" {
			return fmt.Errorf("run curl installer update: %w: %s", result.Err, detail)
		}
		return fmt.Errorf("run curl installer update: %w", result.Err)
	}
	return ctx.Err()
}

func executeHomebrewUpdate(ctx context.Context, runner Runner) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	result := runner.Run("brew", "upgrade", homebrewFormula)
	if result.Err != nil {
		if result.Stderr != "" {
			return fmt.Errorf("run brew upgrade %s: %w: %s", homebrewFormula, result.Err, result.Stderr)
		}
		if result.Stdout != "" {
			return fmt.Errorf("run brew upgrade %s: %w: %s", homebrewFormula, result.Err, result.Stdout)
		}
		return fmt.Errorf("run brew upgrade %s: %w", homebrewFormula, result.Err)
	}
	return ctx.Err()
}

func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
}
