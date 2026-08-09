#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/deploy.log}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/meal-builder_deploy}"
SERVICE_NAME="${SERVICE_NAME:-meal-builder.service}"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

exec > >(tee -a "$LOG_FILE") 2>&1

log "Starting deployment"
log "Repository: $PROJECT_ROOT"
log "Expected branch: $DEPLOY_BRANCH"
log "Remote: $DEPLOY_REMOTE"
log "Service: $SERVICE_NAME"
log "Log file: $LOG_FILE"

if [ ! -d .git ]; then
  log "ERROR: This script must be run from the repository root. Aborting."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  log "ERROR: Working tree is not clean. Aborting."
  git status --short
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
  log "ERROR: Current branch is '$CURRENT_BRANCH'. Expected '$DEPLOY_BRANCH'. Aborting."
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  log "WARNING: SSH key '$SSH_KEY' not found. Proceeding only if SSH config handles github.com-meal-builder."
fi

PREVIOUS_HEAD="$(git rev-parse HEAD)"

export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

log "Fetching updates from $DEPLOY_REMOTE/$DEPLOY_BRANCH"
git fetch "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"

log "Merging updates"
git merge --ff-only "$DEPLOY_REMOTE/$DEPLOY_BRANCH"

CURRENT_HEAD="$(git rev-parse HEAD)"
if [ "$PREVIOUS_HEAD" = "$CURRENT_HEAD" ]; then
  log "No changes detected. Deployment complete."
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$PREVIOUS_HEAD" "$CURRENT_HEAD")"
log "Changed files:\n$CHANGED_FILES"

REQUIREMENTS_CHANGED="$(printf '%s\n' "$CHANGED_FILES" | grep -E '^requirements\.txt$' || true)"
BACKEND_CHANGED="$(printf '%s\n' "$CHANGED_FILES" | grep -E '(^server\.py$|\.py$|^requirements\.txt$)' || true)"

if [ -n "$REQUIREMENTS_CHANGED" ]; then
  if [ -x "./venv/bin/pip" ]; then
    log "requirements.txt changed; installing dependencies in ./venv"
    ./venv/bin/pip install -r requirements.txt
  else
    log "ERROR: requirements.txt changed but ./venv/bin/pip is missing. Create or repair the venv and rerun."
    exit 1
  fi
fi

if [ -n "$BACKEND_CHANGED" ]; then
  log "Backend code changed; restarting $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
  log "Restarted $SERVICE_NAME"
else
  log "No backend restart required"
fi

log "Deployment complete"
