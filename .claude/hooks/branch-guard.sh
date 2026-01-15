#!/bin/bash
# Blocks Write/Edit operations on protected branches

PROTECTED_BRANCHES=("main" "master" "production")
TOOL_NAME="$1"

# Only check for file-modifying tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# Check if on protected branch
for branch in "${PROTECTED_BRANCHES[@]}"; do
  if [[ "$CURRENT_BRANCH" == "$branch" ]]; then
    echo "{\"block\": true, \"message\": \"Cannot edit files on protected branch '$CURRENT_BRANCH'. Create a feature branch first: git checkout -b feature/your-feature\"}"
    exit 2
  fi
done

exit 0
