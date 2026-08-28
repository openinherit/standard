package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/openinherit/inherit-cli/internal/linter"
	"github.com/spf13/cobra"
)

var (
	lintJSONFlag  bool
	lintQuietFlag bool
)

var lintCmd = &cobra.Command{
	Use:   "lint <file>",
	Short: "Check an INHERIT document for best-practice issues",
	Long: `Lint checks an INHERIT document for best-practice issues beyond schema validation.

Rules checked:
  orphaned-reference  — UUID reference field points to an entity not present in the document
  empty-description   — entity has a description field set to ""
  empty-people        — people array is empty when estate is present
  missing-valuation   — asset has estimatedValue but no valuations entry
  stale-export        — exportedAt is more than 365 days in the past

Exit codes:
  0 — no warnings
  1 — warnings found
  2 — runtime error (file not found, invalid JSON, etc.)`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		code := ExecuteLint(args[0], lintJSONFlag, lintQuietFlag, os.Stdout)
		os.Exit(code)
	},
}

func init() {
	lintCmd.Flags().BoolVar(&lintJSONFlag, "json", false, "Output results as JSON")
	lintCmd.Flags().BoolVar(&lintQuietFlag, "quiet", false, "No output — exit code only")
	rootCmd.AddCommand(lintCmd)
}

// ExecuteLint is the testable entry point for the lint command.
// Returns exit code: 0=no warnings, 1=warnings found, 2=error.
func ExecuteLint(file string, jsonOutput, quiet bool, w io.Writer) int {
	data, err := os.ReadFile(file)
	if err != nil {
		if !quiet {
			if jsonOutput {
				out, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("cannot read file: %s", err),
					"file":  file,
				})
				fmt.Fprintln(w, string(out))
			} else {
				fmt.Fprintf(w, "Error: cannot read file: %s\n", err)
			}
		}
		return 2
	}

	result, err := linter.Lint(data)
	if err != nil {
		if !quiet {
			if jsonOutput {
				out, _ := json.Marshal(map[string]any{
					"error": err.Error(),
					"file":  file,
				})
				fmt.Fprintln(w, string(out))
			} else {
				fmt.Fprintf(w, "Error: %s\n", err)
			}
		}
		return 2
	}

	if quiet {
		if result.Total == 0 {
			return 0
		}
		return 1
	}

	if jsonOutput {
		out, _ := json.MarshalIndent(result, "", "  ")
		fmt.Fprintln(w, string(out))
	} else {
		printLintHuman(w, result)
	}

	if result.Total == 0 {
		return 0
	}
	return 1
}

func printLintHuman(w io.Writer, result *linter.LintResult) {
	if result.Total == 0 {
		fmt.Fprintln(w, "No warnings found.")
		return
	}

	// Count distinct rules triggered
	rulesSeen := make(map[string]bool)
	for _, warning := range result.Warnings {
		fmt.Fprintf(w, "⚠ %s: %s %s\n", warning.Rule, warning.Path, warning.Message)
		rulesSeen[warning.Rule] = true
	}

	rulesCount := len(rulesSeen)
	noun := "rule"
	if rulesCount != 1 {
		noun = "rules"
	}
	fmt.Fprintf(w, "\n%d warning(s) (%d %s triggered)\n", result.Total, rulesCount, noun)
}
