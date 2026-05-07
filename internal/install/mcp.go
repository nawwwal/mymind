package install

import "encoding/json"

type MCPServer struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
}

func MergeMCPServer(input []byte, server MCPServer) ([]byte, error) {
	data := map[string]any{}
	if len(input) > 0 {
		if err := json.Unmarshal(input, &data); err != nil {
			return nil, err
		}
	}

	servers, ok := data["mcpServers"].(map[string]any)
	if !ok {
		servers = map[string]any{}
		data["mcpServers"] = servers
	}
	servers["mymind"] = server

	out, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return nil, err
	}
	return append(out, '\n'), nil
}
