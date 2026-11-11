#!/usr/bin/env bash
#
# Privacy gate: this repository is public, so nothing that identifies a person
# or a machine may be committed. Used by the pre-commit hook and by CI.
#
#   scripts/check-privacy.sh --staged [--show]   what is about to be committed
#   scripts/check-privacy.sh --tracked           every tracked file
#   scripts/check-privacy.sh --history           every commit already made
#
# It looks for file names that should never be tracked, files that are too
# large, and personal data inside files: home folders, e-mail addresses,
# public IP addresses, phone numbers and identity numbers. Credentials are
# gitleaks' job (.gitleaks.toml), not this script's.
#
# Findings are printed as "file:line: rule" without the text that matched, so a
# public CI log does not repeat the leak. --show adds the text, for a terminal.

set -euo pipefail

mode=${1:-}
show=0
[ "${2:-}" = "--show" ] && show=1

MAX_BYTES=$((2 * 1024 * 1024))

# --- What may appear -------------------------------------------------------

# E-mail addresses that are meant to be public. Anything else is refused: a
# contributor's address belongs in their Git identity, not in a file.
ALLOWED_EMAIL='^(debi@elysiumx\.org|git@github\.com|noreply@github\.com|[A-Za-z0-9._+-]+(\[bot\])?@users\.noreply\.github\.com|[A-Za-z0-9._%+-]+@(example\.(com|org|net)|contoh\.(com|id)))$'

# Loopback, private and documentation ranges cannot point at a real server.
ALLOWED_IP='^(127\.|0\.0\.0\.0$|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|255\.)'

# --- What may not ----------------------------------------------------------

BLOCKED_NAMES='(^|/)\.env($|\.|/)'
BLOCKED_NAMES+='|\.(pem|key|p12|pfx|jks|keystore|kdbx|ovpn|tfstate|sqlite|sqlite3|db|sql|dump|bak)$'
BLOCKED_NAMES+='|(^|/)id_(rsa|dsa|ecdsa|ed25519)'
BLOCKED_NAMES+='|(^|/)(credentials|client_secret[^/]*|service-account[^/]*)\.json$'
BLOCKED_NAMES+='|(^|/)\.(npmrc|netrc|pypirc|git-credentials|bash_history|zsh_history|htpasswd[^/]*)$'
BLOCKED_NAMES+='|(^|/)(known_hosts|authorized_keys)$'
BLOCKED_NAMES+='|(^|/)\.(ssh|aws|gnupg|kube|docker)/'
BLOCKED_NAMES+='|(^|/)(\.DS_Store|Thumbs\.db|desktop\.ini)$'
ALLOWED_NAMES='(^|/)\.env\.example$'

# One rule per index: its name, an extended regex, extra git grep flags, and an
# allowlist that the matched text (not the whole line) is checked against.
RULE_NAME=() RULE_REGEX=() RULE_FLAGS=() RULE_ALLOW=()
rule() {
  RULE_NAME+=("$1") RULE_REGEX+=("$2") RULE_FLAGS+=("$3") RULE_ALLOW+=("$4")
}
rule "home folder" '/(Users|home)/[A-Za-z0-9._-]+' "" ""
rule "home folder" '[A-Za-z]:[\\/]+Users[\\/]+[A-Za-z0-9._-]+' "" ""
rule "e-mail address" '[A-Za-z0-9._%+-]+(\[bot\])?@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' "" "$ALLOWED_EMAIL"
rule "public IP address" '([0-9]{1,3}\.){3}[0-9]{1,3}' "-w" "$ALLOWED_IP"
rule "phone number" '(62|0)8[0-9]{8,11}' "-w" ""
rule "identity number" '[0-9]{16}' "-w" ""

# Generated files where a long digit run is a hash, not a number someone owns.
NUMERIC_NOISE=':(exclude)package-lock.json'

findings=0

report() {
  findings=$((findings + 1))
  if [ "$show" -eq 1 ] && [ -n "${3:-}" ]; then
    printf '  %s: %s: %s\n' "$1" "$2" "$3" >&2
  else
    printf '  %s: %s\n' "$1" "$2" >&2
  fi
}

check_names() {
  local name
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    if printf '%s\n' "$name" | grep -Eiq "$BLOCKED_NAMES" && ! printf '%s\n' "$name" | grep -Eq "$ALLOWED_NAMES"; then
      report "$name" "this kind of file must not be tracked"
    fi
  done
}

# Scan the given tree-ish (or the index, for "--cached") with every rule.
# git grep -o prints [<tree>:]<file>:<line>:<match>.
scan() {
  local tree=$1 prefix=$2 i name allow line where match out status
  shift 2
  for i in "${!RULE_NAME[@]}"; do
    name=${RULE_NAME[$i]}
    allow=${RULE_ALLOW[$i]}
    local -a args=(-I -n -o -E)
    if [ -n "${RULE_FLAGS[$i]}" ]; then args+=("${RULE_FLAGS[$i]}"); fi
    args+=(-e "${RULE_REGEX[$i]}")
    if [ "$tree" = "--cached" ]; then args+=(--cached); else args+=("$tree"); fi
    args+=(--)
    if [ $# -gt 0 ]; then args+=("$@"); else args+=(.); fi
    case "$name" in "phone number" | "identity number") args+=("$NUMERIC_NOISE") ;; esac

    # git grep exits 1 for "nothing found". Anything else is a broken check,
    # and a broken check must stop the commit, not wave it through.
    status=0
    out=$(git grep "${args[@]}") || status=$?
    if [ "$status" -gt 1 ]; then
      echo "privacy: the scan for \"$name\" failed to run (git grep exit $status)" >&2
      exit 2
    fi

    while IFS= read -r line; do
      [ -n "$line" ] || continue
      if [ "$tree" != "--cached" ]; then line=${line#"$tree":}; fi
      where=$(printf '%s' "$line" | cut -d: -f1-2)
      match=$(printf '%s' "$line" | cut -d: -f3-)
      if [ -n "$allow" ] && printf '%s\n' "$match" | grep -Eq "$allow"; then continue; fi
      report "$prefix$where" "$name" "$match"
    done <<<"$out"
  done
}

check_sizes() {
  local name size
  while IFS= read -r name; do
    [ -f "$name" ] || continue
    size=$(wc -c <"$name" | tr -d ' ')
    if [ "$size" -gt "$MAX_BYTES" ]; then report "$name" "larger than 2 MB ($size bytes)"; fi
  done
}

cd "$(git rev-parse --show-toplevel)"

case "$mode" in
  --staged)
    staged=$(git diff --cached --name-only --diff-filter=ACMR)
    [ -n "$staged" ] || exit 0
    # Here-strings, not pipes: a pipe would run the check in a subshell and lose its findings.
    check_names <<<"$staged"
    check_sizes <<<"$staged"
    files=()
    while IFS= read -r f; do files+=("$f"); done <<<"$staged"
    scan --cached "" "${files[@]}"
    ;;
  --tracked)
    tracked=$(git ls-files)
    check_names <<<"$tracked"
    check_sizes <<<"$tracked"
    scan --cached ""
    ;;
  --history)
    added=$(git log --all --diff-filter=A --name-only --format= | sort -u)
    check_names <<<"$added"
    for commit in $(git rev-list --all); do
      scan "$commit" "${commit:0:7}:"
    done
    ;;
  *)
    echo "usage: $0 --staged [--show] | --tracked | --history" >&2
    exit 2
    ;;
esac

if [ "$findings" -gt 0 ]; then
  printf '\nprivacy: %s finding(s). This repository is public: remove the data, or use a placeholder.\n' "$findings" >&2
  [ "$mode" = "--history" ] && printf 'privacy: data in an old commit stays public until the history is rewritten.\n' >&2
  exit 1
fi
echo "privacy: clean ($mode)"
