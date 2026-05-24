#!/usr/bin/env bash
# add-todo.sh — Append a structured entry to .docs/todo.md
# Usage:
#   bash .claude/hooks/add-todo.sh issue "WebSocket reconnection fails on token refresh" "online-multiplayer"
#   bash .claude/hooks/add-todo.sh task "Add E2E tests for room creation" "testing"
#   bash .claude/hooks/add-todo.sh suggest "Extract shared game timer into a reusable hook" "refactor"
#   bash .claude/hooks/add-todo.sh done "Fixed auth token expiry handling" "online-multiplayer"

set -euo pipefail

TODO_FILE=".docs/todo.md"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <type> <description> [context]"
  echo "  type: issue | task | suggest | done"
  exit 1
fi

TYPE="$1"
DESC="$2"
CONTEXT="${3:-general}"
DATE=$(date +"%Y-%m-%d %H:%M")

# Ensure the file exists
if [ ! -f "$TODO_FILE" ]; then
  echo "Error: $TODO_FILE not found. Run from project root." >&2
  exit 1
fi

case "$TYPE" in
  issue)
    # Count existing issues to generate ID
    COUNT=$(grep -c '^\### \[ISSUE' "$TODO_FILE" 2>/dev/null || echo "0")
    ID=$((COUNT + 1))
    ENTRY="\n### [ISSUE-$(printf '%03d' $ID)] $DESC ($DATE)\n\n> Context: $CONTEXT\n\nStatus: **Open**\n"
    # Insert before the "*(No open issues)*" line
    sed -i "s|\*(No open issues)\*|$ENTRY\n*(No open issues)*|" "$TODO_FILE" 2>/dev/null || \
      echo -e "$ENTRY" >> "$TODO_FILE"
    echo "[OK] Issue recorded: ISSUE-$(printf '%03d' $ID)"
    ;;
  task)
    ENTRY="- [ ] $DESC — @$CONTEXT ($DATE)"
    sed -i "s|\*(No pending tasks)\*|$ENTRY\n\n*(No pending tasks)*|" "$TODO_FILE" 2>/dev/null || \
      echo "$ENTRY" >> "$TODO_FILE"
    echo "[OK] Task recorded: $DESC"
    ;;
  suggest)
    ENTRY="- 💡 $DESC — @$CONTEXT ($DATE)"
    sed -i "s|\*(No suggestions)\*|$ENTRY\n\n*(No suggestions)*|" "$TODO_FILE" 2>/dev/null || \
      echo "$ENTRY" >> "$TODO_FILE"
    echo "[OK] Suggestion recorded: $DESC"
    ;;
  done)
    ENTRY="- [x] $DESC — completed on $DATE"
    sed -i "s|\*(No completed items)\*|$ENTRY\n\n*(No completed items)*|" "$TODO_FILE" 2>/dev/null || \
      echo "$ENTRY" >> "$TODO_FILE"
    echo "[OK] Completed task recorded: $DESC"
    ;;
  *)
    echo "Error: Unknown type '$TYPE'. Use: issue | task | suggest | done" >&2
    exit 1
    ;;
esac
