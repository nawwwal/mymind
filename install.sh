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

configure_target() {
  target="$1"
  mcp_path="$2"
  [ -n "$KID" ] && [ -n "$SECRET" ] || fail "MYMIND_KID and MYMIND_SECRET are required for MCP setup"
  case "$target" in
    codex)
      has codex || fail "codex command not found"
      codex mcp add mymind --env "MYMIND_KID=$KID" --env "MYMIND_SECRET=$SECRET" -- "$mcp_path"
      say "Configured Codex MCP server."
      ;;
    claude-code)
      has claude || fail "claude command not found"
      claude mcp add mymind "$mcp_path" -e "MYMIND_KID=$KID" -e "MYMIND_SECRET=$SECRET"
      say "Configured Claude Code MCP server."
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

os="$(uname -s)"
arch="$(uname -m)"
ext="tar.gz"

case "$os" in
  Darwin)
    case "$arch" in
      arm64) platform="macos_apple_silicon" ;;
      x86_64) platform="macos_intel" ;;
      *) fail "unsupported macOS architecture: $arch" ;;
    esac
    checksum_cmd="shasum -a 256 --check"
    ;;
  Linux)
    case "$arch" in
      x86_64|amd64) platform="linux_x64" ;;
      aarch64|arm64) platform="linux_arm64" ;;
      *) fail "unsupported Linux architecture: $arch" ;;
    esac
    if has sha256sum; then
      checksum_cmd="sha256sum --check"
    elif has shasum; then
      checksum_cmd="shasum -a 256 --check"
    else
      fail "missing required checksum command: sha256sum or shasum"
    fi
    ;;
  *)
    fail "unsupported OS: $os"
    ;;
esac

if [ "$VERSION" = "latest" ]; then
  VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" | sed 's#.*/tag/##')"
fi
asset_version="${VERSION#v}"
asset="mymind_${asset_version}_${platform}.${ext}"
base_url="https://github.com/${REPO}/releases/download/${VERSION}"

tmp="${TMPDIR:-/tmp}/mymind-install.$$"
mkdir -p "$tmp"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "Installing mymind ${VERSION} for ${platform}"
curl -fL "${base_url}/${asset}" -o "${tmp}/${asset}"
curl -fL "${base_url}/checksums.txt" -o "${tmp}/checksums.txt"

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

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) say "Add ${INSTALL_DIR} to PATH before running mymind from a new shell." ;;
esac

if [ -z "$KID" ] && [ "$INTERACTIVE" = "1" ] && confirm "Save mymind credentials now? [y/N]" n; then
  printf 'MYMIND_KID: ' >/dev/tty
  read KID </dev/tty || KID=""
  SECRET="$(read_secret 'MYMIND_SECRET: ')"
fi

if [ -n "$KID" ] && [ -n "$SECRET" ]; then
  "${INSTALL_DIR}/mymind" auth set-key "$KID" "$SECRET" >/dev/null
  say "Saved credentials to mymind config."
fi

detected_targets="$(detect_targets)"
if [ -z "$SETUP_MCP" ] && [ "$INTERACTIVE" = "1" ]; then
  print_target_menu "$detected_targets"
  printf 'Set up MCP for [a/n/1,2,3,4]: ' >/dev/tty
  read setup_choice </dev/tty || setup_choice=""
  SETUP_MCP="$(choice_to_targets "$setup_choice" "$detected_targets")"
elif [ "$SETUP_MCP" = "all" ]; then
  SETUP_MCP="$detected_targets"
fi

if [ -n "$SETUP_MCP" ] && [ "$SETUP_MCP" != "none" ] && [ "$SETUP_MCP" != "no" ]; then
  old_ifs="$IFS"
  IFS=', '
  for target in $SETUP_MCP; do
    [ -n "$target" ] || continue
    configure_target "$target" "${INSTALL_DIR}/mymind-mcp"
  done
  IFS="$old_ifs"
fi

"${INSTALL_DIR}/mymind" version
