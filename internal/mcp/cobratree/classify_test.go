package cobratree

import (
	"testing"

	"github.com/spf13/cobra"
)

func TestUpdateCommandIsFrameworkOnly(t *testing.T) {
	cmd := &cobra.Command{
		Use: "update",
		Run: func(cmd *cobra.Command, args []string) {},
	}

	if got := classify(cmd); got != commandFramework {
		t.Fatalf("classify(update) = %v, want commandFramework", got)
	}
}
