#!/bin/bash
# Blocks Edit/Write operations on protected branches
# Matcher already filters to Edit/Write tools

PROTECTED_BRANCHES=("main" "master" "production")

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

for branch in "${PROTECTED_BRANCHES[@]}"; do
  if [[ "$CURRENT_BRANCH" == "$branch" ]]; then
    echo "{\"block\": true, \"message\": \"Cannot edit files on protected branch '$CURRENT_BRANCH'. Create a feature branch first: git checkout -b feature/your-feature\"}"
    exit 2
  fi
done

exit 0
