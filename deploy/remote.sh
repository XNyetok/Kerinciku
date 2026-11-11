#!/usr/bin/env bash
#
# Runs on the server as the deploy user. The deploy workflow feeds it over SSH:
#
#   ssh ... bash -s -- activate <site-root> <release> < deploy/remote.sh
#   ssh ... bash -s -- rollback <site-root>           < deploy/remote.sh
#
# The site root holds releases/<name>/ plus two symlinks: current (what is
# live) and previous (what rollback goes back to). An operator can run the same
# file by hand: bash deploy/remote.sh rollback <site-root>

set -euo pipefail

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
  local site=$1 release=$2 old file
  [[ "$release" =~ ^[0-9]{14}-[0-9a-f]{7}$ ]] || die "bad release name: $release"
  check_root "$site"
  # A release is complete only with the page and the worker that caches it.
  for file in index.html sw.js js/version.js; do
    [ -f "$site/releases/$release/$file" ] || die "release $release was not uploaded completely: $file is missing"
  done

  old=$(target "$site" current)
  relink "$site" current "releases/$release"

  # Remember what to go back to, then tidy up.
  if [ -n "$old" ] && [ "$old" != "releases/$release" ]; then relink "$site" previous "$old"; fi
  prune "$site"

  echo "Live: $release (previous: ${old:-none})"
}

# Swap current and previous: running it twice undoes it.
rollback() {
  local site=$1 cur prev
  check_root "$site"
  prev=$(target "$site" previous)
  [ -n "$prev" ] || die "no previous release recorded in $site"
  [ -f "$site/$prev/index.html" ] || die "the previous release $prev is gone"

  cur=$(target "$site" current)
  relink "$site" current "$prev"
  if [ -n "$cur" ]; then relink "$site" previous "$cur"; fi
  echo "Rolled back $site: ${cur:-none} -> $prev"
}

command=${1:-}
shift || true
case "$command" in
  activate) [ $# -eq 2 ] || die "usage: activate <site-root> <release>"; activate "$@" ;;
  rollback) [ $# -eq 1 ] || die "usage: rollback <site-root>"; rollback "$@" ;;
  *) die "usage: activate|rollback ..." ;;
esac
