#!/bin/bash
# ZoCW Pre-Flight Check — Run before any git operations
# Detects and fixes OneDrive sync issues that affect git workflows.
# Safe to run multiple times. Prints a summary of what it found/fixed.
#
# Usage: bash preflight.sh
#        (or: source preflight.sh — to run in current shell)
#
# When to run:
#   - At the start of every Cowork session
#   - Before any git commit/push
#   - After switching machines (home ↔ office)
#   - If git commands fail with lock errors

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "=== ZoCW Pre-Flight Check ==="
echo "Repo: $REPO_DIR"
echo ""

ISSUES_FOUND=0
ISSUES_FIXED=0

# --- Check 1: Git lock files ---
echo "[1/5] Checking for stale git lock files..."
LOCKS_FOUND=0
for lockfile in .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock; do
    if [ -f "$lockfile" ]; then
        echo "  ⚠️  Found stale lock: $lockfile"
        rm -f "$lockfile"
        echo "  ✅ Removed $lockfile"
        LOCKS_FOUND=$((LOCKS_FOUND + 1))
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
    fi
done
if [ $LOCKS_FOUND -eq 0 ]; then
    echo "  ✅ No stale lock files"
fi

# --- Check 2: core.fileMode setting ---
echo "[2/5] Checking git core.fileMode..."
FILEMODE=$(git config --get core.fileMode 2>/dev/null || echo "not set")
if [ "$FILEMODE" != "false" ]; then
    echo "  ⚠️  core.fileMode is '$FILEMODE' — OneDrive will cause phantom permission changes"
    git config core.fileMode false
    echo "  ✅ Set core.fileMode = false"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
else
    echo "  ✅ core.fileMode = false (OneDrive-safe)"
fi

# --- Check 3: Permission-only changes in git status ---
echo "[3/5] Checking for permission-only changes..."
PERM_CHANGES=$(git diff --summary 2>/dev/null | grep -c "mode change" || true)
if [ "$PERM_CHANGES" -gt 0 ]; then
    echo "  ⚠️  $PERM_CHANGES permission-only changes detected"
    echo "  ℹ️  These should clear after core.fileMode=false is set. Run 'git checkout -- .' if they persist."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "  ✅ No permission-only changes"
fi

# --- Check 4: GitHub CLI authentication ---
echo "[4/5] Checking GitHub CLI auth..."
if command -v gh &>/dev/null; then
    GH_STATUS=$(gh auth status 2>&1 || true)
    if echo "$GH_STATUS" | grep -q "Logged in"; then
        GH_ACCOUNT=$(echo "$GH_STATUS" | grep "Logged in" | head -1)
        echo "  ✅ $GH_ACCOUNT"
    else
        echo "  ⚠️  GitHub CLI installed but NOT authenticated"
        echo "  ℹ️  Run: gh auth login"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "  ⚠️  GitHub CLI (gh) not installed"
    echo "  ℹ️  Run: brew install gh && gh auth login"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# --- Check 5: OneDrive file accessibility ---
echo "[5/5] Checking file accessibility (OneDrive sync locks)..."
UNREADABLE=0
# Check a sample of key files
for f in HANDOFF.md src/components/Sidebar.tsx src/screens/admin/ManagePractice.tsx; do
    if [ -f "$f" ]; then
        if ! head -1 "$f" &>/dev/null; then
            echo "  ⚠️  Cannot read $f (OneDrive sync lock)"
            UNREADABLE=$((UNREADABLE + 1))
        fi
    fi
done
if [ $UNREADABLE -gt 0 ]; then
    echo "  ⚠️  $UNREADABLE files locked by OneDrive sync — wait and retry"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "  ✅ Key files are readable"
fi

# --- Summary ---
echo ""
echo "=== Pre-Flight Summary ==="
REAL_CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Real uncommitted changes: $REAL_CHANGES files"
echo "Issues found: $ISSUES_FOUND"
echo "Issues auto-fixed: $ISSUES_FIXED"

if [ $ISSUES_FOUND -eq $ISSUES_FIXED ] || [ $ISSUES_FOUND -eq 0 ]; then
    echo "Status: ✅ READY — safe to proceed with git operations"
else
    REMAINING=$((ISSUES_FOUND - ISSUES_FIXED))
    echo "Status: ⚠️  $REMAINING issue(s) need manual attention (see above)"
fi
echo ""
