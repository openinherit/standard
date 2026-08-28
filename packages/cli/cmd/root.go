package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const version = "7.0.0"

var rootCmd = &cobra.Command{
	Use:   "inherit",
	Short: "INHERIT CLI — validate and create estate data documents",
	Long: `INHERIT CLI validates documents against the INHERIT v3 JSON Schema
(Draft 2020-12) and provides tools for creating new documents.

Validation results are informational. They verify schema conformance
and data structure, not legal accuracy or completeness.`,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
}

func init() {
	rootCmd.AddCommand(versionCmd)
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("inherit-cli v%s\nschema: INHERIT v3 (Draft 2020-12)\n", version)
	},
}
