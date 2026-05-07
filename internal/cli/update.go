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

	cmd := &cobra.Command{
		Use:   "update",
		Short: "Update mymind using the detected install method",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			detection := detectInstallForUpdate(flags.currentPath)
			if flags.installMethod != "" {
				detection.Method = install.Method(flags.installMethod)
			}
			if flags.currentPath != "" {
				detection.MymindPath = flags.currentPath
			}
			if flags.mcpPath != "" {
				detection.MCPPath = flags.mcpPath
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
			return configErr(errors.New("live update execution is not implemented yet; rerun with --dry-run or --check to inspect the plan"))
		},
	}

	cmd.Flags().BoolVar(&checkOnly, "check", false, "Check whether an update is available without changing files")
	cmd.Flags().BoolVar(&repairMCP, "repair-mcp", false, "Repair MCP client config without updating binaries")

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
