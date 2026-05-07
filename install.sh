#!/bin/sh
set -eu

REPO="${MYMIND_REPO:-nawwwal/mymind}"
INSTALL_DIR="${MYMIND_INSTALL_DIR:-}"
VERSION="${MYMIND_VERSION:-latest}"
SETUP_MCP="${MYMIND_SETUP_MCP:-}"
KID="${MYMIND_KID:-}"
SECRET="${MYMIND_SECRET:-}"
YES="${MYMIND_YES:-}"
INTERACTIVE=0
CREDENTIALS_FROM_CONFIG=0
KID_FROM_CONFIG=0
SECRET_FROM_CONFIG=0
if ( : </dev/tty >/dev/tty ) 2>/dev/null; then
  INTERACTIVE=1
fi

say() {
  printf '%s\n' "$*"
}

fail() {
  printf 'mymind install: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

has() {
  command -v "$1" >/dev/null 2>&1
}

config_path() {
  if [ -n "${MYMIND_CONFIG:-}" ]; then
    printf '%s' "$MYMIND_CONFIG"
  else
    printf '%s/.config/mymind/config.toml' "$HOME"
  fi
}

metadata_path() {
  printf '%s/.config/mymind/install.json' "$HOME"
}

toml_value() {
  key="$1"
  file="$2"
  sed -n "s/^[	 ]*${key}[	 ]*=[	 ]*\"\(.*\)\"[	 ]*$/\1/p" "$file" | sed -n '1p'
}

load_saved_credentials() {
  file="$(config_path)"
  [ -f "$file" ] || return 1
  saved_kid="$(toml_value kid "$file")"
  saved_secret="$(toml_value secret "$file")"
  loaded=0
  if [ -z "$KID" ]; then
    if [ -n "$saved_kid" ]; then
      KID="$saved_kid"
      KID_FROM_CONFIG=1
      loaded=1
    fi
  fi
  if [ -z "$SECRET" ]; then
    if [ -n "$saved_secret" ]; then
      SECRET="$saved_secret"
      SECRET_FROM_CONFIG=1
      loaded=1
    fi
  fi
  if credentials_loaded_entirely_from_config; then
    CREDENTIALS_FROM_CONFIG=1
  fi
  [ "$loaded" = "1" ] || return 1
  say "Using saved mymind credentials from $file."
  return 0
}

credentials_loaded_entirely_from_config() {
  [ "$KID_FROM_CONFIG" = "1" ] && [ "$SECRET_FROM_CONFIG" = "1" ]
}

is_yes() {
  [ "$YES" = "1" ] || [ "$YES" = "true" ] || [ "$YES" = "yes" ]
}

confirm() {
  prompt="$1"
  default="${2:-n}"
  if is_yes; then
    return 0
  fi
  if [ "$INTERACTIVE" != "1" ]; then
    [ "$default" = "y" ]
    return
  fi
  printf '%s ' "$prompt" >/dev/tty
  read ans </dev/tty || ans=""
  case "$ans" in
    y|Y|yes|YES) return 0 ;;
    "") [ "$default" = "y" ] ;;
    *) return 1 ;;
  esac
}

read_secret() {
  prompt="$1"
  if [ "$INTERACTIVE" != "1" ]; then
    return 1
  fi
  printf '%s' "$prompt" >/dev/tty
  stty -echo </dev/tty 2>/dev/null || true
  read value </dev/tty || value=""
  stty echo </dev/tty 2>/dev/null || true
  printf '\n' >/dev/tty
  printf '%s' "$value"
}

append_unique() {
  list="$1"
  item="$2"
  case ",$list," in
    *",$item,"*) printf '%s' "$list" ;;
    ",,") printf '%s' "$item" ;;
    *) printf '%s,%s' "$list" "$item" ;;
  esac
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_install_metadata() {
  path="$(metadata_path)"
  dir="$(dirname "$path")"
  mkdir -p "$dir"
  installed_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  cat >"$path" <<EOF
{
  "method": "curl",
  "version": "$(json_escape "$VERSION")",
  "repo": "$(json_escape "$REPO")",
  "installed_at": "$(json_escape "$installed_at")",
  "install_dir": "$(json_escape "$INSTALL_DIR")",
  "mymind_path": "$(json_escape "${INSTALL_DIR}/mymind")",
  "mymind_mcp_path": "$(json_escape "${INSTALL_DIR}/mymind-mcp")",
  "platform": "$(json_escape "$platform")"
}
EOF
  chmod 600 "$path" 2>/dev/null || true
  say "Wrote install metadata: $path"
}

json_configure_mcp() {
  file="$1"
  command_path="$2"
  mkdir -p "$(dirname "$file")"
  if [ ! -f "$file" ]; then
    cat >"$file" <<EOF
{
  "mcpServers": {
    "mymind": {
      "command": "${command_path}",
      "env": {
        "MYMIND_KID": "${KID}",
        "MYMIND_SECRET": "${SECRET}"
      }
    }
  }
}
EOF
    chmod 600 "$file" 2>/dev/null || true
    return
  fi
  if has python3; then
    python3 - "$file" "$command_path" "$KID" "$SECRET" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
command = sys.argv[2]
kid = sys.argv[3]
secret = sys.argv[4]

try:
    data = json.loads(path.read_text())
except Exception:
    data = {}

servers = data.setdefault("mcpServers", {})
servers["mymind"] = {
    "command": command,
    "env": {
        "MYMIND_KID": kid,
        "MYMIND_SECRET": secret,
    },
}
path.write_text(json.dumps(data, indent=2) + "\n")
PY
    chmod 600 "$file" 2>/dev/null || true
  else
    fail "$file already exists; install python3 or add the mymind MCP config manually"
  fi
}

detect_targets() {
  targets=""
  if has codex; then
    targets="$(append_unique "$targets" codex)"
  fi
  if has claude; then
    targets="$(append_unique "$targets" claude-code)"
  fi
  if [ -d "$HOME/Library/Application Support/Claude" ] || [ -d "/Applications/Claude.app" ]; then
    targets="$(append_unique "$targets" claude-desktop)"
  fi
  if has cursor || [ -d "$HOME/.cursor" ]; then
    targets="$(append_unique "$targets" cursor)"
  fi
  printf '%s' "$targets"
}

print_target_menu() {
  say ""
  say "MCP setup"
  say "  1) Update all detected clients"
  say "  2) Choose clients"
  say "  3) Skip"
}

print_client_menu() {
  detected="$1"
  say ""
  say "MCP clients detected:"
  n=1
  for target in codex claude-code claude-desktop cursor; do
    case ",$detected," in
      *",$target,"*) status="detected" ;;
      *) status="not detected" ;;
    esac
    say "  ${n}) ${target} (${status})"
    n=$((n + 1))
  done
  say "  a) all detected"
  say "  n) none"
}

choice_to_targets() {
  choice="$1"
  detected="$2"
  out=""
  old_ifs="$IFS"
  IFS=', '
  for item in $choice; do
    case "$item" in
      1|codex) out="$(append_unique "$out" codex)" ;;
      2|claude|claude-code) out="$(append_unique "$out" claude-code)" ;;
      3|claude-desktop|desktop) out="$(append_unique "$out" claude-desktop)" ;;
      4|cursor) out="$(append_unique "$out" cursor)" ;;
      a|all) out="$detected" ;;
      n|none|no|"") ;;
      *) fail "unknown MCP setup choice: $item" ;;
    esac
  done
  IFS="$old_ifs"
  printf '%s' "$out"
}

configure_codex_mcp() {
  mcp_path="$1"
  has codex || fail "codex command not found"
  codex mcp remove mymind >/dev/null 2>&1 || true
  codex mcp add mymind --env "MYMIND_KID=$KID" --env "MYMIND_SECRET=$SECRET" -- "$mcp_path"
  say "Configured Codex MCP server."
}

configure_claude_code_mcp() {
  mcp_path="$1"
  has claude || fail "claude command not found"
  claude mcp remove mymind --scope user >/dev/null 2>&1 || true
  claude mcp add mymind "$mcp_path" --scope user -e "MYMIND_KID=$KID" -e "MYMIND_SECRET=$SECRET"
  say "Configured Claude Code MCP server."
}

setup_needs_credentials() {
  [ -n "$SETUP_MCP" ] && [ "$SETUP_MCP" != "none" ] && [ "$SETUP_MCP" != "no" ]
}

configure_target() {
  target="$1"
  mcp_path="$2"
  [ -n "$KID" ] && [ -n "$SECRET" ] || fail "MYMIND_KID and MYMIND_SECRET are required for MCP setup"
  case "$target" in
    codex)
      configure_codex_mcp "$mcp_path"
      ;;
    claude-code)
      configure_claude_code_mcp "$mcp_path"
      ;;
    claude-desktop)
      case "$(uname -s)" in
        Darwin) file="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
        *) file="$HOME/.config/Claude/claude_desktop_config.json" ;;
      esac
      json_configure_mcp "$file" "$mcp_path"
      say "Configured Claude Desktop MCP server: $file"
      ;;
    cursor)
      file="$HOME/.cursor/mcp.json"
      json_configure_mcp "$file" "$mcp_path"
      say "Configured Cursor MCP server: $file"
      ;;
    *)
      fail "unknown MCP setup target: $target"
      ;;
  esac
}

need curl
need tar
need grep
need sed

load_saved_credentials || true

os="$(uname -s)"
arch="$(uname -m)"
ext="tar.gz"

case "$os" in
  Darwin)
    case "$arch" in
      arm64) platform="macos_apple_silicon" ;;
      x86_64) fail "prebuilt releases are Apple Silicon only on macOS. Build from source on Intel Mac." ;;
      *) fail "unsupported macOS architecture: $arch" ;;
    esac
    checksum_cmd="shasum -a 256 --check"
    ;;
  Linux)
    fail "prebuilt releases are macOS Apple Silicon only. Build from source on Linux."
    ;;
  *)
    fail "unsupported OS: $os"
    ;;
esac

if [ "$VERSION" = "latest" ]; then
  say "Resolving latest mymind release..."
  VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" | sed 's#.*/tag/##')"
fi
asset_version="${VERSION#v}"
asset="mymind_${asset_version}_${platform}.${ext}"
base_url="https://github.com/${REPO}/releases/download/${VERSION}"

tmp="${TMPDIR:-/tmp}/mymind-install.$$"
mkdir -p "$tmp"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "Installing mymind ${VERSION} for ${platform}"
say "Downloading mymind release archive..."
curl -fsSL "${base_url}/${asset}" -o "${tmp}/${asset}"
say "Downloading checksums..."
curl -fsSL "${base_url}/checksums.txt" -o "${tmp}/checksums.txt"

(cd "$tmp" && grep " ${asset}$" checksums.txt | $checksum_cmd) >/dev/null || fail "checksum verification failed"

tar -xzf "${tmp}/${asset}" -C "$tmp"
[ -f "${tmp}/mymind" ] || fail "archive did not contain mymind"
[ -f "${tmp}/mymind-mcp" ] || fail "archive did not contain mymind-mcp"

chmod +x "${tmp}/mymind" "${tmp}/mymind-mcp"
if has xattr; then
  xattr -d com.apple.quarantine "${tmp}/mymind" "${tmp}/mymind-mcp" 2>/dev/null || true
fi

if [ -z "$INSTALL_DIR" ]; then
  if [ -w /usr/local/bin ]; then
    INSTALL_DIR="/usr/local/bin"
  else
    INSTALL_DIR="${HOME}/.local/bin"
  fi
fi
mkdir -p "$INSTALL_DIR"

if [ -w "$INSTALL_DIR" ]; then
  cp "${tmp}/mymind" "${tmp}/mymind-mcp" "$INSTALL_DIR/"
else
  has sudo || fail "$INSTALL_DIR is not writable and sudo is unavailable"
  sudo cp "${tmp}/mymind" "${tmp}/mymind-mcp" "$INSTALL_DIR/"
fi

say "Installed:"
say "  ${INSTALL_DIR}/mymind"
say "  ${INSTALL_DIR}/mymind-mcp"
write_install_metadata

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) say "Add ${INSTALL_DIR} to PATH before running mymind from a new shell." ;;
esac

detected_targets="$(detect_targets)"
if [ "$SETUP_MCP" = "all" ]; then
  SETUP_MCP="$detected_targets"
elif [ -z "$SETUP_MCP" ] && [ -z "$detected_targets" ]; then
  say "No MCP clients detected. Rerun with MYMIND_SETUP_MCP=codex,claude-code,cursor to configure one explicitly."
elif [ -z "$SETUP_MCP" ] && is_yes; then
  SETUP_MCP="$detected_targets"
elif [ -z "$SETUP_MCP" ] && [ "$INTERACTIVE" = "1" ]; then
  print_target_menu "$detected_targets"
  printf 'Choose [1]: ' >/dev/tty
  read setup_mode </dev/tty || setup_mode=""
  case "$setup_mode" in
    ""|1) SETUP_MCP="$detected_targets" ;;
    2)
      print_client_menu "$detected_targets"
      printf 'Set up MCP for [a/n/1,2,3,4]: ' >/dev/tty
      read setup_choice </dev/tty || setup_choice=""
      SETUP_MCP="$(choice_to_targets "$setup_choice" "$detected_targets")"
      ;;
    3|n|N|none|no) SETUP_MCP="none" ;;
    *) fail "unknown MCP setup choice: $setup_mode" ;;
  esac
fi

if setup_needs_credentials && { [ -z "$KID" ] || [ -z "$SECRET" ]; } && [ "$INTERACTIVE" = "1" ] && confirm "Save mymind credentials now? [y/N]" n; then
  printf 'MYMIND_KID: ' >/dev/tty
  read KID </dev/tty || KID=""
  SECRET="$(read_secret 'MYMIND_SECRET: ')"
fi

if [ -n "$KID" ] && [ -n "$SECRET" ] && [ "$CREDENTIALS_FROM_CONFIG" != "1" ]; then
  "${INSTALL_DIR}/mymind" auth set-key "$KID" "$SECRET" >/dev/null
  say "Saved credentials to mymind config."
fi

if setup_needs_credentials; then
  old_ifs="$IFS"
  IFS=', '
  for target in $SETUP_MCP; do
    [ -n "$target" ] || continue
    configure_target "$target" "${INSTALL_DIR}/mymind-mcp"
  done
  IFS="$old_ifs"
elif [ -z "$KID" ] || [ -z "$SECRET" ]; then
  say "Credentials not saved. Set them later with: mymind auth set-key <kid> <base64-secret>"
fi

"${INSTALL_DIR}/mymind" version
