#!/usr/bin/env bash
#
# Runs on the server as the deploy user. The deploy workflow feeds it over SSH:
#
#   ssh ... bash -s -- activate <site-root> <collector-root> <release> < deploy/remote.sh
#   ssh ... bash -s -- rollback <site-root> <collector-root>           < deploy/remote.sh
#
# Both roots hold releases/<name>/ plus two symlinks: current (what is live)
# and previous (what rollback goes back to). An operator can run the same file
# by hand: bash deploy/remote.sh rollback <site-root> <collector-root>
#
# The collector (server/) is never restarted from here: it notices that
# `current` points somewhere else and stops, and its service starts the new
# release. This script only waits for the new one to answer.

set -euo pipefail

HEALTH_URL=${KERINCIKU_HEALTH_URL:-http://127.0.0.1:8788/api/health}
KEEP=5

die() {
  echo "remote: $*" >&2
  exit 1
}

check_root() {
  # Absolute, at least two levels deep, no "..", no shell characters.
  [[ "$1" =~ ^/[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)+$ && "$1" != *..* ]] || die "bad root: $1"
  [ -d "$1/releases" ] || die "$1/releases does not exist"
}

# Point <root>/<link> at <target> in one step, so no request sees a half switch.
relink() {
  ln -sfn "$3" "$1/$2.next"
  mv -Tf "$1/$2.next" "$1/$2"
}

target() {
  readlink "$1/$2" 2>/dev/null || true
}

# Healthy, and when a release is named, running that release.
collector_healthy() {
  local want=$1 body=
  for _ in $(seq 1 "${KERINCIKU_HEALTH_TRIES:-40}"); do
    body=$(curl -fsS --max-time 2 "$HEALTH_URL" 2>/dev/null || true)
    if [[ "$body" == *'"ok":true'* ]] && { [ -z "$want" ] || [[ "$body" == *"\"release\":\"$want\""* ]]; }; then
      return 0
    fi
    sleep "${KERINCIKU_HEALTH_WAIT:-0.5}"
  done
  echo "remote: last health answer: ${body:-none}" >&2
  return 1
}

# Keep the newest releases, and never the ones current or previous point at.
prune() {
  local root=$1 keep_current keep_previous dir name
  keep_current=$(target "$root" current)
  keep_previous=$(target "$root" previous)
  # shellcheck disable=SC2012 # release names are checked to be [0-9a-f-] only
  while IFS= read -r dir; do
    dir=${dir%/}
    name="releases/${dir##*/}"
    if [ "$name" = "$keep_current" ] || [ "$name" = "$keep_previous" ]; then continue; fi
    rm -rf -- "$dir"
  done < <(ls -1dt "$root"/releases/*/ | tail -n +$((KEEP + 1)))
}

activate() {
  local site=$1 collector=$2 release=$3 old_site old_collector file
  [[ "$release" =~ ^[0-9]{14}-[0-9a-f]{7}$ ]] || die "bad release name: $release"
  check_root "$site"
  check_root "$collector"
  # A release is complete only with the page and the worker that caches it.
  for file in index.html sw.js js/version.js; do
    [ -f "$site/releases/$release/$file" ] || die "release $release was not uploaded completely: $file is missing"
  done
  for file in index.mjs store.mjs panel/index.html RELEASE; do
    [ -f "$collector/releases/$release/$file" ] || die "collector release $release was not uploaded completely: $file is missing"
  done

  old_site=$(target "$site" current)
  old_collector=$(target "$collector" current)

  # 1. The collector first: if it does not come up, the site stays where it was.
  relink "$collector" current "releases/$release"
  if ! collector_healthy "$release"; then
    echo "remote: collector $release failed its health check" >&2
    if [ -n "$old_collector" ]; then
      relink "$collector" current "$old_collector"
      if collector_healthy ""; then echo "remote: collector restored to $old_collector" >&2
      else echo "remote: the restored collector is not healthy either" >&2; fi
    fi
    exit 1
  fi

  # 2. The site.
  relink "$site" current "releases/$release"

  # 3. Remember what to go back to, then tidy up.
  if [ -n "$old_site" ] && [ "$old_site" != "releases/$release" ]; then relink "$site" previous "$old_site"; fi
  if [ -n "$old_collector" ] && [ "$old_collector" != "releases/$release" ]; then
    relink "$collector" previous "$old_collector"
  fi
  prune "$site"
  prune "$collector"

  echo "Live: $release (previous site: ${old_site:-none}, previous collector: ${old_collector:-none})"
}

# Swap current and previous: running it twice undoes it. The site always goes
# back; the collector goes back with it when it has a previous release.
rollback() {
  local site=$1 collector=$2 cur prev failed=0
  check_root "$site"
  check_root "$collector"
  prev=$(target "$site" previous)
  [ -n "$prev" ] || die "no previous release recorded in $site"
  [ -f "$site/$prev/index.html" ] || die "the previous release $prev is gone"

  cur=$(target "$site" current)
  relink "$site" current "$prev"
  if [ -n "$cur" ]; then relink "$site" previous "$cur"; fi
  echo "Rolled back $site: ${cur:-none} -> $prev"

  prev=$(target "$collector" previous)
  if [ -n "$prev" ] && [ -f "$collector/$prev/index.mjs" ]; then
    cur=$(target "$collector" current)
    relink "$collector" current "$prev"
    if [ -n "$cur" ]; then relink "$collector" previous "$cur"; fi
    echo "Rolled back $collector: ${cur:-none} -> $prev"
    collector_healthy "" || { echo "remote: the collector is not healthy after the rollback" >&2; failed=1; }
  else
    echo "remote: the collector has no previous release and stays where it is" >&2
  fi
  return "$failed"
}

command=${1:-}
shift || true
case "$command" in
  activate) [ $# -eq 3 ] || die "usage: activate <site-root> <collector-root> <release>"; activate "$@" ;;
  rollback) [ $# -eq 2 ] || die "usage: rollback <site-root> <collector-root>"; rollback "$@" ;;
  *) die "usage: activate|rollback ..." ;;
esac
