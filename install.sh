#!/bin/sh
set -eu

REPO="${MYMIND_REPO:-nawwwal/mymind}"
INSTALL_DIR="${MYMIND_INSTALL_DIR:-}"
VERSION="${MYMIND_VERSION:-latest}"
SETUP_MCP="${MYMIND_SETUP_MCP:-}"
KID="${MYMIND_KID:-}"
SECRET="${MYMIND_SECRET:-}"

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

confirm() {
  prompt="$1"
  default="${2:-n}"
  if [ ! -t 0 ]; then
    [ "$default" = "y" ]
    return
  fi
  printf '%s ' "$prompt"
  read ans || ans=""
  case "$ans" in
    y|Y|yes|YES) return 0 ;;
    "") [ "$default" = "y" ] ;;
    *) return 1 ;;
  esac
}

read_secret() {
  prompt="$1"
  if [ ! -t 0 ]; then
    return 1
  fi
  printf '%s' "$prompt" >&2
  stty -echo 2>/dev/null || true
  read value || value=""
  stty echo 2>/dev/null || true
  printf '\n' >&2
  printf '%s' "$value"
}

need curl
need tar
need grep

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
    if command -v sha256sum >/dev/null 2>&1; then
      checksum_cmd="sha256sum --check"
    else
      checksum_cmd="shasum -a 256 --check"
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

say "Downloading ${asset}"
curl -fL "${base_url}/${asset}" -o "${tmp}/${asset}"
curl -fL "${base_url}/checksums.txt" -o "${tmp}/checksums.txt"

(cd "$tmp" && grep " ${asset}$" checksums.txt | $checksum_cmd) >/dev/null || fail "checksum verification failed"

tar -xzf "${tmp}/${asset}" -C "$tmp"
[ -f "${tmp}/mymind" ] || fail "archive did not contain mymind"
[ -f "${tmp}/mymind-mcp" ] || fail "archive did not contain mymind-mcp"

chmod +x "${tmp}/mymind" "${tmp}/mymind-mcp"
if command -v xattr >/dev/null 2>&1; then
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
  command -v sudo >/dev/null 2>&1 || fail "$INSTALL_DIR is not writable and sudo is unavailable"
  sudo cp "${tmp}/mymind" "${tmp}/mymind-mcp" "$INSTALL_DIR/"
fi

say "Installed:"
say "  ${INSTALL_DIR}/mymind"
say "  ${INSTALL_DIR}/mymind-mcp"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) say "Add ${INSTALL_DIR} to PATH before running mymind from a new shell." ;;
esac

if [ -z "$KID" ] && [ -t 0 ] && confirm "Save mymind credentials now? [y/N]" n; then
  printf 'MYMIND_KID: ' >&2
  read KID || KID=""
  SECRET="$(read_secret 'MYMIND_SECRET: ')"
fi

if [ -n "$KID" ] && [ -n "$SECRET" ]; then
  "${INSTALL_DIR}/mymind" auth set-key "$KID" "$SECRET" >/dev/null
  say "Saved credentials to mymind config."
fi

if [ -z "$SETUP_MCP" ] && [ -t 0 ]; then
  say "MCP setup options: codex, claude-code, none"
  printf 'Set up MCP for: '
  read SETUP_MCP || SETUP_MCP=""
fi

case "$SETUP_MCP" in
  codex)
    command -v codex >/dev/null 2>&1 || fail "codex command not found"
    [ -n "$KID" ] && [ -n "$SECRET" ] || fail "MYMIND_KID and MYMIND_SECRET are required for Codex MCP setup"
    codex mcp add mymind --env "MYMIND_KID=$KID" --env "MYMIND_SECRET=$SECRET" -- "${INSTALL_DIR}/mymind-mcp"
    say "Configured Codex MCP server: mymind"
    ;;
  claude-code|claude)
    command -v claude >/dev/null 2>&1 || fail "claude command not found"
    [ -n "$KID" ] && [ -n "$SECRET" ] || fail "MYMIND_KID and MYMIND_SECRET are required for Claude Code MCP setup"
    claude mcp add mymind "${INSTALL_DIR}/mymind-mcp" -e "MYMIND_KID=$KID" -e "MYMIND_SECRET=$SECRET"
    say "Configured Claude Code MCP server: mymind"
    ;;
  ""|none|no)
    ;;
  *)
    fail "unknown MCP setup target: $SETUP_MCP"
    ;;
esac

"${INSTALL_DIR}/mymind" version
