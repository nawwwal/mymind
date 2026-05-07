package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectInstallMethodFromCurlMetadata(t *testing.T) {
	tmp := t.TempDir()
	bin := filepath.Join(tmp, "bin")
	if err := os.MkdirAll(bin, 0o755); err != nil {
		t.Fatal(err)
	}
	mymind := filepath.Join(bin, "mymind")
	if err := os.WriteFile(mymind, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	meta := Metadata{
		Method:      "curl",
		Version:     "1.3.4",
		Repo:        "nawwwal/mymind",
		InstallDir:  bin,
		MymindPath:  mymind,
		MCPPath:     filepath.Join(bin, "mymind-mcp"),
		Platform:    "macos_apple_silicon",
		InstalledAt: "2026-05-08T00:00:00Z",
	}

	result := Detect(DetectOptions{
		ExecutablePath: mymind,
		Metadata:       &meta,
		LookPath:       func(string) (string, error) { return "", os.ErrNotExist },
		Run:            fakeRunner{},
		Env:            map[string]string{},
	})

	if result.Method != MethodCurl {
		t.Fatalf("method = %s, want %s", result.Method, MethodCurl)
	}
	if result.MymindPath != mymind {
		t.Fatalf("mymind path = %q, want %q", result.MymindPath, mymind)
	}
}

func TestDetectInstallMethodPrefersHomebrew(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/opt/homebrew/bin/mymind",
		Metadata: &Metadata{
			Method:     "curl",
			MymindPath: "/opt/homebrew/bin/mymind",
		},
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/opt/homebrew/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
		}},
		Env: map[string]string{},
	})

	if result.Method != MethodHomebrew {
		t.Fatalf("method = %s, want %s", result.Method, MethodHomebrew)
	}
}

func TestDetectInstallMethodFindsIntelHomebrew(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/usr/local/bin/mymind",
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/usr/local/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
		}},
		Env: map[string]string{},
	})

	if result.Method != MethodHomebrew {
		t.Fatalf("method = %s, want %s", result.Method, MethodHomebrew)
	}
}

func TestDetectInstallMethodUnknownForUnownedPath(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/tmp/mymind",
		LookPath:       func(string) (string, error) { return "", os.ErrNotExist },
		Run:            fakeRunner{},
		Env:            map[string]string{},
	})

	if result.Method != MethodUnknown {
		t.Fatalf("method = %s, want %s", result.Method, MethodUnknown)
	}
}

type fakeRunner struct {
	outputs map[string]CommandResult
}

func (r fakeRunner) Run(name string, args ...string) CommandResult {
	key := name
	for _, arg := range args {
		key += " " + arg
	}
	if out, ok := r.outputs[key]; ok {
		return out
	}
	return CommandResult{Err: os.ErrNotExist}
}
