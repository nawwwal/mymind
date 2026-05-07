package cli

import (
	"errors"
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
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			detection := detectInstallForUpdate(currentPath)
			if installMethod != "" {
				detection.Method = install.Method(installMethod)
			}
			if currentPath != "" {
				detection.MymindPath = currentPath
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

			if err := printUpdatePlan(cmd, flags, plan); err != nil {
				return err
			}
			if plan.Error != "" {
				return configErr(errors.New(plan.Error))
			}
			if flags.dryRun || checkOnly || !plan.CanMutate {
				return nil
			}
			return configErr(install.ExecuteUpdate(cmd.Context(), plan, install.ExecuteOptions{Runner: updateCommandRunner{}}))
		},
	}

	cmd.Flags().BoolVar(&checkOnly, "check", false, "Check whether an update is available without changing files")
	cmd.Flags().BoolVar(&repairMCP, "repair-mcp", false, "Plan MCP client config repair without updating binaries")
	cmd.Flags().StringVar(&installMethod, "install-method", "", "Override detected install method for tests")
	cmd.Flags().StringVar(&currentPath, "current-path", "", "Override current binary path for tests")
	cmd.Flags().StringVar(&mcpPath, "mcp-path", "", "Override MCP binary path for tests")
	_ = cmd.Flags().MarkHidden("install-method")
	_ = cmd.Flags().MarkHidden("current-path")
	_ = cmd.Flags().MarkHidden("mcp-path")

	return cmd
}

func detectInstallForUpdate(currentPath string) install.Detection {
	exe := currentPath
	if exe == "" {
		if found, err := os.Executable(); err == nil {
			exe = found
		}
	}
	meta, _ := install.LoadMetadata(install.DefaultMetadataPath())
	return install.Detect(install.DetectOptions{
		ExecutablePath: exe,
		Metadata:       meta,
		LookPath:       exec.LookPath,
		Run:            updateCommandRunner{},
		Env:            updateEnvMap(),
	})
}

func printUpdatePlan(cmd *cobra.Command, flags *rootFlags, plan install.UpdatePlan) error {
	if flags.asJSON {
		return flags.printJSON(cmd, plan)
	}
	fmt.Fprintf(cmd.OutOrStdout(), "method: %s\n", plan.Method)
	fmt.Fprintf(cmd.OutOrStdout(), "current: %s\n", plan.Current)
	for _, action := range plan.Actions {
		detail := action.Message
		if action.Command != "" {
			detail = action.Command
		}
		if detail == "" {
			fmt.Fprintf(cmd.OutOrStdout(), "- %s\n", action.Name)
			continue
		}
		fmt.Fprintf(cmd.OutOrStdout(), "- %s: %s\n", action.Name, detail)
	}
	if plan.Error != "" {
		fmt.Fprintln(cmd.ErrOrStderr(), plan.Error)
	}
	return nil
}

type updateCommandRunner struct{}

func (updateCommandRunner) Run(name string, args ...string) install.CommandResult {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	return install.CommandResult{Stdout: string(out), Err: err}
}

func updateEnvMap() map[string]string {
	out := map[string]string{}
	for _, key := range []string{"GOBIN", "GOPATH"} {
		out[key] = os.Getenv(key)
	}
	return out
}
