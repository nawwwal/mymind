package install

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Metadata struct {
	Method      string `json:"method"`
	Version     string `json:"version"`
	Repo        string `json:"repo"`
	InstalledAt string `json:"installed_at"`
	InstallDir  string `json:"install_dir"`
	MymindPath  string `json:"mymind_path"`
	MCPPath     string `json:"mymind_mcp_path"`
	Platform    string `json:"platform"`
}

func DefaultMetadataPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return ""
	}
	return filepath.Join(home, ".config", "mymind", "install.json")
}

func LoadMetadata(path string) (*Metadata, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var meta Metadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("parse install metadata %s: %w", path, err)
	}
	return &meta, nil
}

func SaveMetadata(path string, meta Metadata) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return fmt.Errorf("create metadata dir: %w", err)
	}
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal install metadata: %w", err)
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0o600)
}
