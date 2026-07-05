#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_BRANCH="trunk"

cd "$ROOT_DIR"

AUTO_YES=false
if [[ "${1:-}" == "-y" || "${1:-}" == "--yes" ]]; then
  AUTO_YES=true
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes — commit or stash before releasing." >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "$RELEASE_BRANCH" ]]; then
  echo "Warning: releases are normally cut from '$RELEASE_BRANCH', but you're on '$current_branch'."
  if [[ "$AUTO_YES" != true ]]; then
    read -rp "Continue anyway? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
  fi
fi

git fetch --tags --quiet

latest_tag="$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -1)"

if [[ -z "$latest_tag" ]]; then
  new_tag="v0.1.0"
else
  version="${latest_tag#v}"
  major="${version%%.*}"
  rest="${version#*.}"
  minor="${rest%%.*}"
  patch="${rest#*.}"
  new_tag="v${major}.${minor}.$((patch + 1))"
fi

echo "Latest tag: ${latest_tag:-(none found)}"
echo "New version: $new_tag"

if [[ "$AUTO_YES" != true ]]; then
  read -rp "Create and push tag $new_tag, then publish a GitHub release? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

git tag -a "$new_tag" -m "Release $new_tag"
git push origin "$new_tag"

gh release create "$new_tag" --title "$new_tag" --generate-notes

echo "Done — $new_tag published. GitHub Actions will build and push the image."
