#!/bin/bash
# Auto-format supported files after Edit/Write
# Matcher already filters to Edit/Write tools

FILE_PATH="$2"

# Check if file has supported extension
if [[ "$FILE_PATH" =~ \.(js|ts|jsx|tsx|svelte|css|json|md)$ ]]; then
  bun run format "$FILE_PATH" 2>/dev/null
  echo '{"feedback": "Formatted", "suppressOutput": true}'
fi

exit 0
