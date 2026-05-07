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
	if want := cleanPath(mymind); result.MymindPath != want {
		t.Fatalf("mymind path = %q, want %q", result.MymindPath, want)
	}
}

func TestDetectInstallMethodPrefersHomebrew(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/opt/homebrew/Cellar/mymind/1.3.4/bin/mymind",
		Metadata: &Metadata{
			Method:     "curl",
			MymindPath: "/opt/homebrew/Cellar/mymind/1.3.4/bin/mymind",
		},
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/opt/homebrew/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
			"brew list --formula nawwwal/whimsies/mymind": {
				Stdout: "/opt/homebrew/Cellar/mymind/1.3.4/bin/mymind\n",
			},
		}},
		Env: map[string]string{},
	})

	if result.Method != MethodHomebrew {
		t.Fatalf("method = %s, want %s", result.Method, MethodHomebrew)
	}
}

func TestDetectInstallMethodFindsIntelHomebrew(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/usr/local/Cellar/mymind/1.3.4/bin/mymind",
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/usr/local/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
			"brew list --formula nawwwal/whimsies/mymind": {
				Stdout: "/usr/local/Cellar/mymind/1.3.4/bin/mymind\n",
			},
		}},
		Env: map[string]string{},
	})

	if result.Method != MethodHomebrew {
		t.Fatalf("method = %s, want %s", result.Method, MethodHomebrew)
	}
}

func TestDetectInstallMethodRejectsHomebrewFormulaThatDoesNotOwnBinary(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/opt/homebrew/bin/mymind",
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/opt/homebrew/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "mymind: stable 1.3.4\n"},
			"brew list --formula nawwwal/whimsies/mymind": {
				Stdout: "/opt/homebrew/Cellar/mymind/1.3.4/bin/other\n",
			},
		}},
		Env: map[string]string{},
	})

	if result.Method == MethodHomebrew {
		t.Fatalf("method = %s, want non-homebrew when formula does not list current binary", result.Method)
	}
}

func TestDetectInstallMethodDoesNotUseAvailableButUninstalledHomebrewFormula(t *testing.T) {
	result := Detect(DetectOptions{
		ExecutablePath: "/opt/homebrew/bin/mymind",
		LookPath: func(name string) (string, error) {
			if name == "brew" {
				return "/opt/homebrew/bin/brew", nil
			}
			return "", os.ErrNotExist
		},
		Run: fakeRunner{outputs: map[string]CommandResult{
			"brew info nawwwal/whimsies/mymind": {Stdout: "Not installed\nFrom: https://github.com/nawwwal/homebrew-whimsies\n"},
		}},
		Env: map[string]string{},
	})

	if result.Method == MethodHomebrew {
		t.Fatalf("method = %s, want non-homebrew for available but uninstalled formula", result.Method)
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

func TestCleanPathResolvesSymlinksWhenPossible(t *testing.T) {
	tmp := t.TempDir()
	target := filepath.Join(tmp, "target")
	link := filepath.Join(tmp, "link")
	if err := os.WriteFile(target, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(target, link); err != nil {
		t.Fatal(err)
	}
	expected, err := filepath.EvalSymlinks(target)
	if err != nil {
		t.Fatal(err)
	}

	if got := cleanPath(link); got != expected {
		t.Fatalf("cleanPath(%q) = %q, want %q", link, got, expected)
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
