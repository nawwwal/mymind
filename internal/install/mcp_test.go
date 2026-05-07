package install

import (
	"encoding/json"
	"testing"
)

func TestMergeMCPServerPreservesOtherServers(t *testing.T) {
	input := []byte(`{"theme":"dark","mcpServers":{"other":{"command":"node","args":["server.js"]}}}`)
	out, err := MergeMCPServer(input, MCPServer{
		Command: "/Users/me/.local/bin/mymind-mcp",
		Env: map[string]string{
			"MYMIND_KID":    "kid",
			"MYMIND_SECRET": "secret",
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatal(err)
	}
	if parsed["theme"] != "dark" {
		t.Fatalf("top-level config was not preserved: %s", out)
	}
	servers := parsed["mcpServers"].(map[string]any)
	if _, ok := servers["other"]; !ok {
		t.Fatalf("other server was removed: %s", out)
	}
	mymind := servers["mymind"].(map[string]any)
	if mymind["command"] != "/Users/me/.local/bin/mymind-mcp" {
		t.Fatalf("wrong command: %#v", mymind)
	}
	env := mymind["env"].(map[string]any)
	if env["MYMIND_KID"] != "kid" || env["MYMIND_SECRET"] != "secret" {
		t.Fatalf("wrong env: %#v", env)
	}
}

func TestMergeMCPServerCreatesConfigFromEmptyInput(t *testing.T) {
	out, err := MergeMCPServer(nil, MCPServer{
		Command: "/tmp/mymind-mcp",
		Args:    []string{"serve"},
	})
	if err != nil {
		t.Fatal(err)
	}

	var parsed map[string]map[string]MCPServer
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("output is invalid JSON: %v\n%s", err, out)
	}
	server := parsed["mcpServers"]["mymind"]
	if server.Command != "/tmp/mymind-mcp" {
		t.Fatalf("command = %q, want %q", server.Command, "/tmp/mymind-mcp")
	}
	if len(server.Args) != 1 || server.Args[0] != "serve" {
		t.Fatalf("args = %#v, want serve", server.Args)
	}
}

func TestMergeMCPServerRejectsInvalidJSON(t *testing.T) {
	_, err := MergeMCPServer([]byte("{not valid json\n"), MCPServer{
		Command: "/tmp/mymind-mcp",
	})
	if err == nil {
		t.Fatal("expected invalid JSON error")
	}
}
