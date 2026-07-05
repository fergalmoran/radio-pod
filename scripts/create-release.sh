#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RELEASE_BRANCH="trunk"
SOURCE_BRANCH="develop"

cd "$ROOT_DIR"

AUTO_YES=false
if [[ "${1:-}" == "-y" || "${1:-}" == "--yes" ]]; then
  AUTO_YES=true
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes — commit or stash before releasing." >&2
  exit 1
fi

original_branch="$(git rev-parse --abbrev-ref HEAD)"

git fetch origin --quiet --tags

echo "Switching to '$RELEASE_BRANCH' and merging '$SOURCE_BRANCH' into it..."
git checkout --quiet "$RELEASE_BRANCH"

if ! git merge --ff-only "origin/$RELEASE_BRANCH"; then
  echo "'$RELEASE_BRANCH' has local commits that don't match origin — resolve manually before releasing." >&2
  git checkout --quiet "$original_branch"
  exit 1
fi

if ! git merge --no-ff "$SOURCE_BRANCH" -m "Merge $SOURCE_BRANCH into $RELEASE_BRANCH for release"; then
  echo "Merge conflict — resolve it on '$RELEASE_BRANCH', commit, then re-run this script." >&2
  exit 1
fi

git push origin "$RELEASE_BRANCH"
git push origin "$SOURCE_BRANCH"

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
  read -rp "Create and push tag $new_tag from '$RELEASE_BRANCH', then publish a GitHub release? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; git checkout --quiet "$original_branch"; exit 1; }
fi

git tag -a "$new_tag" -m "Release $new_tag"
git push origin "$new_tag"

gh release create "$new_tag" --title "$new_tag" --generate-notes

git checkout --quiet "$original_branch"

echo "Done — $new_tag published from '$RELEASE_BRANCH'. GitHub Actions will build and push the image."
