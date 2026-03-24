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

# Determine timeout command — macOS needs gtimeout from coreutils, Linux has timeout built-in
if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &>/dev/null; then
    TIMEOUT_CMD="timeout"
else
    TIMEOUT_CMD=""
fi

# --- Check 1: Git lock files ---
echo "[1/6] Checking for stale git lock files..."
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
echo "[2/6] Checking git core.fileMode..."
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
echo "[3/6] Checking for permission-only changes..."
PERM_CHANGES=$(git diff --summary 2>/dev/null | grep -c "mode change" || true)
if [ "$PERM_CHANGES" -gt 0 ]; then
    echo "  ⚠️  $PERM_CHANGES permission-only changes detected"
    echo "  ℹ️  These should clear after core.fileMode=false is set. Run 'git checkout -- .' if they persist."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "  ✅ No permission-only changes"
fi

# --- Check 4: GitHub CLI authentication ---
echo "[4/6] Checking GitHub CLI auth..."
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
echo "[5/6] Checking file accessibility (OneDrive sync locks)..."
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

# --- Check 6: OneDrive cloud-only (on-demand) files ---
echo "[6/6] Checking for cloud-only files not yet downloaded..."
# OneDrive Files On-Demand can leave files as cloud-only stubs.
# These appear in directory listings but aren't actually on disk.
# Reading them triggers a download, but it can take time.
# We detect stubs by attempting a timed read — if it hangs or fails, the file is cloud-only.

# Helper: read with timeout. Returns 1 if file is unreadable/cloud-only.
_try_read() {
    local file="$1"
    if [ -n "$TIMEOUT_CMD" ]; then
        $TIMEOUT_CMD 2 head -c 1 "$file" &>/dev/null 2>&1
    else
        # No timeout command available — best-effort read (may hang on true cloud-only stubs)
        head -c 1 "$file" &>/dev/null 2>&1
    fi
}

CLOUD_ONLY_FILES=()
KEY_FILES=(
    HANDOFF.md
    package.json
    src/App.tsx
    src/components/Sidebar.tsx
    src/screens/admin/ManagePractice.tsx
    tsconfig.json
    vite.config.ts
)

if [ -z "$TIMEOUT_CMD" ]; then
    echo "  ℹ️  No timeout command found (install coreutils: brew install coreutils)"
    echo "     Cloud-only detection will work but cannot enforce read timeouts."
fi

for f in "${KEY_FILES[@]}"; do
    if [ -e "$f" ]; then
        if ! _try_read "$f"; then
            CLOUD_ONLY_FILES+=("$f")
        fi
    fi
done

if [ ${#CLOUD_ONLY_FILES[@]} -gt 0 ]; then
    echo "  ⚠️  ${#CLOUD_ONLY_FILES[@]} cloud-only file(s) detected — not yet downloaded from OneDrive:"
    for f in "${CLOUD_ONLY_FILES[@]}"; do
        echo "      - $f"
    done
    echo "  ⏳ Triggering download and waiting (retry every 15s, max 2 min)..."

    # Force download by reading each file (triggers OneDrive on-demand fetch)
    for f in "${CLOUD_ONLY_FILES[@]}"; do
        cat "$f" > /dev/null 2>&1 &
    done

    MAX_RETRIES=8   # 8 x 15s = 2 minutes
    RETRY=0
    STILL_PENDING=("${CLOUD_ONLY_FILES[@]}")
    while [ $RETRY -lt $MAX_RETRIES ]; do
        sleep 15
        RETRY=$((RETRY + 1))
        NEXT_PENDING=()
        for f in "${STILL_PENDING[@]}"; do
            if ! _try_read "$f"; then
                NEXT_PENDING+=("$f")
            fi
        done
        STILL_PENDING=("${NEXT_PENDING[@]}")
        if [ ${#STILL_PENDING[@]} -eq 0 ]; then
            echo "  ✅ All cloud-only files downloaded successfully (after $((RETRY * 15))s)"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
            ISSUES_FIXED=$((ISSUES_FIXED + 1))
            break
        else
            ELAPSED=$((RETRY * 15))
            echo "  ⏳ ${#STILL_PENDING[@]} file(s) still downloading... (${ELAPSED}s elapsed)"
        fi
    done

    # If we exhausted retries, fail
    if [ ${#STILL_PENDING[@]} -gt 0 ]; then
        echo "  ❌ FAILED: ${#STILL_PENDING[@]} file(s) could not be downloaded after 2 minutes:"
        for f in "${STILL_PENDING[@]}"; do
            echo "      - $f"
        done
        echo ""
        echo "  👉 USER ACTION REQUIRED:"
        echo "     Open Finder and navigate to the repo folder to force OneDrive to sync."
        echo "     Then re-run: bash preflight.sh"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "  ✅ All key files are local (no cloud-only stubs)"
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
