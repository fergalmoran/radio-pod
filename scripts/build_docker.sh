#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/radio-pod/radio-pod"
TAG="${1:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building $IMAGE:$TAG ..."
docker build \
  --target runtime \
  --tag "$IMAGE:$TAG" \
  --tag "$IMAGE:latest" \
  "$ROOT_DIR"

echo "Pushing $IMAGE:$TAG ..."
docker push "$IMAGE:$TAG"
docker push "$IMAGE:latest"

echo "Done — $IMAGE:$TAG"
