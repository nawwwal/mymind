package install

import (
	"context"
	"errors"
	"fmt"
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
			continue
		case "download-release", "verify-checksum", "replace-binaries", "write-metadata":
			return errors.New("curl update execution requires release downloader/replacer; refusing to mutate")
		default:
			return fmt.Errorf("unsupported update action %q", action.Name)
		}
	}
	return nil
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
