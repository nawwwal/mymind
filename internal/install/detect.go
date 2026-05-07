package install

import (
	"errors"
	"path/filepath"
	"strings"
)

type Method string

const (
	MethodHomebrew Method = "homebrew"
	MethodCurl     Method = "curl"
	MethodSource   Method = "source"
	MethodUnknown  Method = "unknown"
)

type CommandResult struct {
	Stdout string
	Stderr string
	Err    error
}

type Runner interface {
	Run(name string, args ...string) CommandResult
}

type DetectOptions struct {
	ExecutablePath string
	Metadata       *Metadata
	LookPath       func(string) (string, error)
	Run            Runner
	Env            map[string]string
}

type Detection struct {
	Method     Method `json:"method"`
	MymindPath string `json:"mymind_path"`
	MCPPath    string `json:"mymind_mcp_path,omitempty"`
	Reason     string `json:"reason"`
}

func Detect(opts DetectOptions) Detection {
	path := cleanPath(opts.ExecutablePath)
	if path == "" {
		path = "mymind"
	}
	if isHomebrewInstall(path, opts) {
		return Detection{Method: MethodHomebrew, MymindPath: path, Reason: "homebrew formula detected"}
	}
	if opts.Metadata != nil && opts.Metadata.Method == "curl" {
		metaPath := cleanPath(opts.Metadata.MymindPath)
		if metaPath != "" && sameOrDerivedPath(path, metaPath) {
			return Detection{
				Method:     MethodCurl,
				MymindPath: path,
				MCPPath:    cleanPath(opts.Metadata.MCPPath),
				Reason:     "curl install metadata matches current binary",
			}
		}
	}
	if isSourcePath(path, opts.Env) {
		return Detection{Method: MethodSource, MymindPath: path, Reason: "binary path looks source-built"}
	}
	return Detection{Method: MethodUnknown, MymindPath: path, Reason: "no supported install owner detected"}
}

func cleanPath(path string) string {
	if path == "" {
		return ""
	}
	if abs, err := filepath.Abs(path); err == nil {
		return abs
	}
	return filepath.Clean(path)
}

func sameOrDerivedPath(actual, expected string) bool {
	actual = cleanPath(actual)
	expected = cleanPath(expected)
	if actual == expected {
		return true
	}
	return filepath.Base(actual) == filepath.Base(expected) && filepath.Dir(actual) == filepath.Dir(expected)
}

func isHomebrewInstall(path string, opts DetectOptions) bool {
	if opts.LookPath == nil || opts.Run == nil {
		return false
	}
	if _, err := opts.LookPath("brew"); err != nil {
		return false
	}
	if !strings.Contains(path, "/homebrew/") && !strings.Contains(path, "/Cellar/") {
		return false
	}
	res := opts.Run.Run("brew", "info", "nawwwal/whimsies/mymind")
	return res.Err == nil
}

func isSourcePath(path string, env map[string]string) bool {
	if strings.Contains(path, "/go/bin/") || strings.Contains(path, "/bin/mymind") && strings.Contains(path, "/projects/") {
		return true
	}
	for _, key := range []string{"GOBIN", "GOPATH"} {
		root := env[key]
		if root == "" {
			continue
		}
		if key == "GOPATH" {
			root = filepath.Join(root, "bin")
		}
		rel, err := filepath.Rel(root, path)
		if err == nil && rel != "." && !strings.HasPrefix(rel, "..") {
			return true
		}
	}
	return false
}

var ErrUnsupportedInstallMethod = errors.New("unsupported install method")
