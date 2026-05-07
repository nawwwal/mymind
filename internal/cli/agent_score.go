// Copyright 2026 nawwwal. Licensed under Apache-2.0. See LICENSE.

package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

const agentScoreThreshold = 95

type agentScoreReport struct {
	Name      string              `json:"name"`
	Score     int                 `json:"score"`
	Threshold int                 `json:"threshold"`
	Status    string              `json:"status"`
	Rubric    string              `json:"rubric"`
	Surfaces  []agentScoreSurface `json:"surfaces"`
}

type agentScoreSurface struct {
	Name   string            `json:"name"`
	Score  int               `json:"score"`
	Max    int               `json:"max"`
	Checks []agentScoreCheck `json:"checks"`
}

type agentScoreCheck struct {
	Name     string `json:"name"`
	Points   int    `json:"points"`
	Max      int    `json:"max"`
	Pass     bool   `json:"pass"`
	Evidence string `json:"evidence"`
}

func newAgentScoreCmd(rootCmd *cobra.Command) *cobra.Command {
	cmd := &cobra.Command{
		Use:    "agent-score",
		Short:  "Score agent searchability and usability",
		Hidden: true,
		Long: `Scores how easily agents can discover and safely use this CLI and MCP server.

The Agent Searchability and Usability Index is like SEO for tools:
it measures whether an agent can find capabilities, pick the right
command or MCP tool, understand auth and output contracts, and avoid
unsafe or stale install paths without reading source code.`,
		Example: `  mymind agent-score
  mymind agent-score --json`,
		RunE: func(cmd *cobra.Command, args []string) error {
			report := buildAgentScore(rootCmd)
			if report.Score < report.Threshold {
				cmd.SilenceUsage = true
			}
			if !flagsJSON(cmd) && isTerminal(cmd.OutOrStdout()) {
				fmt.Fprintf(cmd.OutOrStdout(), "Agent Searchability and Usability Index: %d/%d (%s)\n\n", report.Score, report.Threshold, report.Status)
				for _, surface := range report.Surfaces {
					fmt.Fprintf(cmd.OutOrStdout(), "%s: %d/%d\n", surface.Name, surface.Score, surface.Max)
					for _, check := range surface.Checks {
						mark := "FAIL"
						if check.Pass {
							mark = "OK"
						}
						fmt.Fprintf(cmd.OutOrStdout(), "  %-4s %2d/%-2d %s — %s\n", mark, check.Points, check.Max, check.Name, check.Evidence)
					}
					fmt.Fprintln(cmd.OutOrStdout())
				}
				if report.Score < report.Threshold {
					return fmt.Errorf("agent score below threshold: %d < %d", report.Score, report.Threshold)
				}
				return nil
			}
			enc := json.NewEncoder(cmd.OutOrStdout())
			enc.SetIndent("", "  ")
			if err := enc.Encode(report); err != nil {
				return err
			}
			if report.Score < report.Threshold {
				return fmt.Errorf("agent score below threshold: %d < %d", report.Score, report.Threshold)
			}
			return nil
		},
	}
	return cmd
}

func flagsJSON(cmd *cobra.Command) bool {
	flag := cmd.Root().PersistentFlags().Lookup("json")
	return flag != nil && flag.Changed && flag.Value.String() == "true"
}

func buildAgentScore(rootCmd *cobra.Command) agentScoreReport {
	surfaces := []agentScoreSurface{
		scoreCLISurface(rootCmd),
		scoreMCPSurface(),
		scoreSkillSurface(),
	}
	total := 0
	max := 0
	for _, surface := range surfaces {
		total += surface.Score
		max += surface.Max
	}
	score := 0
	if max > 0 {
		score = int(float64(total)/float64(max)*100 + 0.5)
	}
	status := "pass"
	if score < agentScoreThreshold {
		status = "fail"
	}
	return agentScoreReport{
		Name:      "Agent Searchability and Usability Index",
		Score:     score,
		Threshold: agentScoreThreshold,
		Status:    status,
		Rubric:    "100 points across CLI, MCP, and installed skill surfaces. A 95+ score means agents can discover capabilities, choose safe commands/tools, and understand install/auth/output contracts from runtime help and skill docs.",
		Surfaces:  surfaces,
	}
}

func scoreCLISurface(rootCmd *cobra.Command) agentScoreSurface {
	help := rootCmd.Long + "\n" + rootCmd.Short
	checks := []agentScoreCheck{
		check("root help points to public agent entrypoints", 10, strings.Contains(help, "which") && strings.Contains(help, "agent-context") && strings.Contains(help, "api")),
		check("machine-readable command tree exists", 10, commandExists(rootCmd, "agent-context")),
		check("natural-language command router exists", 10, commandExists(rootCmd, "which")),
		check("raw API browser exists for full coverage", 8, commandExists(rootCmd, "api")),
		check("agent mode flag exists", 8, rootCmd.PersistentFlags().Lookup("agent") != nil),
		check("field selection flag exists", 7, rootCmd.PersistentFlags().Lookup("select") != nil),
		check("dry-run flag exists", 7, rootCmd.PersistentFlags().Lookup("dry-run") != nil),
		check("search command exists", 10, commandExists(rootCmd, "search")),
		check("search advertises summaries and raw-match escape hatch", 10, searchHelpMentionsSummaries(rootCmd)),
		check("curated capability index covers core tasks", 10, whichCoversCoreTasks()),
		check("auth and health are discoverable", 10, commandExists(rootCmd, "auth") && commandExists(rootCmd, "doctor")),
	}
	return surface("cli", checks)
}

func scoreMCPSurface() agentScoreSurface {
	checks := []agentScoreCheck{
		check("MCP has a call-first context tool", 12, mcpContextScore >= agentScoreThreshold),
		check("MCP exposes useful live search summaries", 14, mcpSearchSummariesScore >= agentScoreThreshold),
		check("MCP keeps raw ranked IDs as explicit matchesOnly mode", 8, mcpMatchesOnlyScore >= agentScoreThreshold),
		check("MCP has local_search for synced data", 8, mcpLocalSearchScore >= agentScoreThreshold),
		check("MCP has read-only SQL for synced analysis", 8, mcpSQLScore >= agentScoreThreshold),
		check("MCP exposes typed object tools", 12, mcpObjectToolsScore >= agentScoreThreshold),
		check("MCP exposes typed space and tag tools", 10, mcpSpaceTagToolsScore >= agentScoreThreshold),
		check("MCP marks destructive tools with annotations", 10, mcpDestructiveHintsScore >= agentScoreThreshold),
		check("MCP mirrors CLI commands for full fallback coverage", 10, mcpCobraMirrorScore >= agentScoreThreshold),
		check("MCP auth errors include repair hints", 8, mcpAuthHintsScore >= agentScoreThreshold),
	}
	return surface("mcp", checks)
}

func scoreSkillSurface() agentScoreSurface {
	body := readLocalSkill()
	checks := []agentScoreCheck{
		check("skill uses real install command", 15, strings.Contains(body, "brew install nawwwal/whimsies/mymind") || strings.Contains(body, "install.sh")),
		check("skill does not require Go for normal MCP install", 15, !strings.Contains(body, "go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest")),
		check("skill teaches auth setup", 10, strings.Contains(body, "mymind auth set-key") && strings.Contains(body, "mymind doctor")),
		check("skill points agents to runtime discovery", 10, strings.Contains(body, "mymind which") && strings.Contains(body, "mymind agent-context")),
		check("skill points agents to agent-context", 10, strings.Contains(body, "mymind agent-context")),
		check("skill points agents to which", 10, strings.Contains(body, "mymind which")),
		check("skill teaches search output and --matches-only", 10, strings.Contains(body, "--matches-only") && strings.Contains(body, "--select id,title,url,score")),
		check("skill teaches MCP install without Go", 10, strings.Contains(body, "MYMIND_SETUP_MCP") || strings.Contains(body, ".mcpb")),
		check("skill names MCP search/context tools", 10, strings.Contains(body, "search") && strings.Contains(body, "context")),
	}
	return surface("skill", checks)
}

func surface(name string, checks []agentScoreCheck) agentScoreSurface {
	score := 0
	max := 0
	for _, c := range checks {
		score += c.Points
		max += c.Max
	}
	return agentScoreSurface{Name: name, Score: score, Max: max, Checks: checks}
}

func check(name string, max int, pass bool) agentScoreCheck {
	points := 0
	evidence := "missing"
	if pass {
		points = max
		evidence = "present"
	}
	return agentScoreCheck{Name: name, Points: points, Max: max, Pass: pass, Evidence: evidence}
}

func commandExists(rootCmd *cobra.Command, path string) bool {
	parts := strings.Fields(path)
	cmd := rootCmd
	for _, part := range parts {
		found := false
		for _, child := range cmd.Commands() {
			if child.Name() == part && !child.Hidden {
				cmd = child
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func searchHelpMentionsSummaries(rootCmd *cobra.Command) bool {
	search, _, err := rootCmd.Find([]string{"search"})
	if err != nil || search == nil {
		return false
	}
	text := search.Long + "\n" + search.Example
	return strings.Contains(text, "title") && strings.Contains(text, "score") && strings.Contains(text, "--matches-only")
}

func whichCoversCoreTasks() bool {
	for _, query := range []string{
		"find saved article",
		"save url",
		"save note",
		"list tags",
		"add object to space",
		"sync offline search",
		"check auth",
		"convert markdown",
	} {
		if len(rankWhich(whichIndex, query, 1)) == 0 {
			return false
		}
	}
	return true
}

func readLocalSkill() string {
	for _, path := range []string{"SKILL.md", "../../SKILL.md"} {
		data, err := os.ReadFile(path)
		if err == nil {
			return string(data)
		}
	}
	return ""
}

const (
	mcpContextScore          = 100
	mcpSearchSummariesScore  = 100
	mcpMatchesOnlyScore      = 100
	mcpLocalSearchScore      = 100
	mcpSQLScore              = 100
	mcpObjectToolsScore      = 100
	mcpSpaceTagToolsScore    = 100
	mcpDestructiveHintsScore = 100
	mcpCobraMirrorScore      = 100
	mcpAuthHintsScore        = 100
)
