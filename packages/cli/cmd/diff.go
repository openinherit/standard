package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/openinherit/inherit-cli/internal/differ"
	"github.com/spf13/cobra"
)

var (
	diffLevelFlag           string
	diffJSONFlag            bool
	diffIncludeMetadataFlag bool
)

var diffCmd = &cobra.Command{
	Use:   "diff <old.json> <new.json>",
	Short: "Show schema-aware differences between two INHERIT documents",
	Long: `Diff compares two INHERIT documents and shows what has changed.

Entities are matched by their "id" field, not by array position.
Metadata fields (exportedAt, generator, lastModifiedAt, applicationState,
conformance) are ignored by default.

Output levels:
  summary — one-line description of all changes (default)
  detail  — per-entity listing with changed fields
  patch   — RFC 6902 JSON Patch array

Exit codes:
  0 — no changes
  1 — changes found
  2 — runtime error (file not found, invalid JSON, etc.)`,
	Args: cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		code := ExecuteDiff(args[0], args[1], diffLevelFlag, diffJSONFlag, diffIncludeMetadataFlag, os.Stdout)
		os.Exit(code)
	},
}

func init() {
	diffCmd.Flags().StringVar(&diffLevelFlag, "level", "summary", "Output level: summary, detail, or patch")
	diffCmd.Flags().BoolVar(&diffJSONFlag, "json", false, "Output results as JSON")
	diffCmd.Flags().BoolVar(&diffIncludeMetadataFlag, "include-metadata", false, "Include metadata fields in the diff")
	rootCmd.AddCommand(diffCmd)
}

// ExecuteDiff is the testable entry point for the diff command.
// Returns exit code: 0=no changes, 1=changes found, 2=error.
func ExecuteDiff(oldFile, newFile string, level string, jsonOutput, includeMetadata bool, w io.Writer) int {
	oldData, err := os.ReadFile(oldFile)
	if err != nil {
		writeError(w, jsonOutput, fmt.Sprintf("cannot read file: %s", err), oldFile)
		return 2
	}
	newData, err := os.ReadFile(newFile)
	if err != nil {
		writeError(w, jsonOutput, fmt.Sprintf("cannot read file: %s", err), newFile)
		return 2
	}

	result, err := differ.Diff(oldData, newData, includeMetadata)
	if err != nil {
		writeError(w, jsonOutput, err.Error(), "")
		return 2
	}

	if result.TotalChanges == 0 {
		if !jsonOutput {
			fmt.Fprintln(w, "No changes.")
		} else {
			out, _ := json.MarshalIndent(differ.BuildJSONOutput(result), "", "  ")
			fmt.Fprintln(w, string(out))
		}
		return 0
	}

	// Changes found — format output
	if jsonOutput {
		if level == "patch" {
			patch := differ.BuildPatch(result)
			out, _ := json.MarshalIndent(patch, "", "  ")
			fmt.Fprintln(w, string(out))
		} else {
			out, _ := json.MarshalIndent(differ.BuildJSONOutput(result), "", "  ")
			fmt.Fprintln(w, string(out))
		}
	} else {
		switch level {
		case "detail":
			fmt.Fprint(w, differ.FormatDetail(result))
		case "patch":
			patch := differ.BuildPatch(result)
			out, _ := json.MarshalIndent(patch, "", "  ")
			fmt.Fprintln(w, string(out))
		default: // "summary"
			fmt.Fprintln(w, result.Summary)
		}
	}

	return 1
}

// writeError outputs an error message in the appropriate format.
func writeError(w io.Writer, jsonOutput bool, msg, file string) {
	if jsonOutput {
		payload := map[string]any{"error": msg}
		if file != "" {
			payload["file"] = file
		}
		out, _ := json.Marshal(payload)
		fmt.Fprintln(w, string(out))
	} else {
		if file != "" {
			fmt.Fprintf(w, "Error: %s (%s)\n", msg, file)
		} else {
			fmt.Fprintf(w, "Error: %s\n", msg)
		}
	}
}
