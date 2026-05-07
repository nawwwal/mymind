package install

import (
	"errors"
	"path/filepath"
	"strings"
)

const homebrewFormula = "nawwwal/whimsies/mymind"

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
	brewPath, err := opts.LookPath("brew")
	if err != nil {
		return false
	}
	if !looksHomebrewOwnedPath(path, brewPath) {
		return false
	}
	if res := opts.Run.Run("brew", "info", homebrewFormula); res.Err != nil {
		return false
	}
	return hasInstalledHomebrewFormula(path, brewPath, opts.Run)
}

func looksHomebrewOwnedPath(path, brewPath string) bool {
	path = cleanPath(path)
	brewPath = cleanPath(brewPath)
	if strings.Contains(path, "/homebrew/") || strings.Contains(path, "/Cellar/") {
		return true
	}
	return strings.HasPrefix(path, "/usr/local/") && strings.HasPrefix(brewPath, "/usr/local/")
}

func hasInstalledHomebrewFormula(path, brewPath string, runner Runner) bool {
	if res := runner.Run("brew", "list", "--formula", homebrewFormula); res.Err == nil {
		return true
	}
	res := runner.Run("brew", "--prefix", homebrewFormula)
	if res.Err != nil {
		return false
	}
	prefix := strings.TrimSpace(res.Stdout)
	if prefix == "" {
		return false
	}
	return pathRelatesToHomebrewPrefix(path, brewPath, prefix)
}

func pathRelatesToHomebrewPrefix(path, brewPath, prefix string) bool {
	path = cleanPath(path)
	brewPath = cleanPath(brewPath)
	prefix = cleanPath(prefix)
	if isWithin(path, prefix) {
		return true
	}
	return homebrewRoot(path) != "" && homebrewRoot(path) == homebrewRoot(brewPath) && homebrewRoot(path) == homebrewRoot(prefix)
}

func isWithin(path, root string) bool {
	rel, err := filepath.Rel(root, path)
	return err == nil && rel != "." && !strings.HasPrefix(rel, "..")
}

func homebrewRoot(path string) string {
	path = cleanPath(path)
	for _, root := range []string{"/opt/homebrew", "/usr/local"} {
		if path == root || strings.HasPrefix(path, root+"/") {
			return root
		}
	}
	return ""
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
