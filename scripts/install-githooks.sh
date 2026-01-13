#!/bin/sh
set -e

if git rev-parse --git-dir > /dev/null 2>&1; then
  git config core.hooksPath .githooks
else
  echo "Skipping git hooks install: not a git repository."
fi
