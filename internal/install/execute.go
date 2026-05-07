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

	switch plan.Method {
	case MethodHomebrew:
		return executeHomebrewUpdate(ctx, opts.Runner)
	case MethodCurl:
		return errors.New("curl update execution requires release downloader/replacer; refusing to mutate")
	default:
		if plan.Current == "" {
			return fmt.Errorf("%s install method cannot be updated automatically", plan.Method)
		}
		return fmt.Errorf("%s install method cannot be updated automatically for %s", plan.Method, plan.Current)
	}
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
