// Copyright 2026 nawwwal. Licensed under Apache-2.0. See LICENSE.

package cli

import (
	"os"
	"strings"
	"testing"
)

func TestAgentScoreMeetsThreshold(t *testing.T) {
	report := buildAgentScore(RootCmd())
	if report.Score < agentScoreThreshold {
		t.Fatalf("agent score = %d, want >= %d: %#v", report.Score, agentScoreThreshold, report)
	}
	for _, surface := range report.Surfaces {
		if surface.Score < agentScoreThreshold {
			t.Fatalf("%s surface score = %d, want >= %d: %#v", surface.Name, surface.Score, agentScoreThreshold, surface.Checks)
		}
	}
}

func TestWhichCoversCoreAgentTasks(t *testing.T) {
	cases := []struct {
		query string
		want  string
	}{
		{"find saved article", "search"},
		{"save url", "objects create"},
		{"save note", "objects create"},
		{"list tags", "tags list"},
		{"add object to space", "objects spaces add-object"},
		{"sync offline search", "sync"},
		{"check auth", "doctor"},
		{"convert markdown", "convert content"},
	}
	for _, tc := range cases {
		matches := rankWhich(whichIndex, tc.query, 1)
		if len(matches) == 0 {
			t.Fatalf("which has no match for %q", tc.query)
		}
		if got := matches[0].Entry.Command; got != tc.want {
			t.Fatalf("which top match for %q = %q, want %q", tc.query, got, tc.want)
		}
	}
}

func TestDocsMentionNativeUpdate(t *testing.T) {
	for _, path := range []string{"../../README.md", "../../SKILL.md"} {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		body := string(data)
		if !strings.Contains(body, "mymind update") {
			t.Fatalf("%s does not mention mymind update", path)
		}
	}
}
