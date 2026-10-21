package cmd

import "testing"

// DO NOT MERGE: probe that a red `cli` check blocks a merge into main.
func TestProbeRequiredCheckBlocksMerge(t *testing.T) {
	t.Fatal("deliberate failure: the cli required check must block this PR")
}
